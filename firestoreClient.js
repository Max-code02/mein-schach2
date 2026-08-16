const fs = require('fs');
const path = require('path');

function getFirebaseConfig() {
    try {
        const configPath = path.join(__dirname, 'firebase-applet-config.json');
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (e) {
        console.warn('Fehler beim Lesen der firebase-applet-config.json:', e.message);
    }
    return null;
}

// Convert native JS values to Firestore REST field format
function toFirestoreValue(val) {
    if (val === null || val === undefined) {
        return { nullValue: null };
    }
    if (typeof val === 'boolean') {
        return { booleanValue: val };
    }
    if (typeof val === 'number') {
        if (Number.isInteger(val)) {
            return { integerValue: String(val) };
        }
        return { doubleValue: val };
    }
    if (typeof val === 'string') {
        return { stringValue: val };
    }
    if (Array.isArray(val)) {
        return {
            arrayValue: {
                values: val.map(toFirestoreValue)
            }
        };
    }
    if (typeof val === 'object') {
        const fields = {};
        for (const [k, v] of Object.entries(val)) {
            if (v !== undefined) {
                fields[k] = toFirestoreValue(v);
            }
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
}

// Convert Firestore REST field format to native JS values
function fromFirestoreValue(valObj) {
    if (!valObj) return null;
    if ('stringValue' in valObj) return valObj.stringValue;
    if ('integerValue' in valObj) return parseInt(valObj.integerValue, 10);
    if ('doubleValue' in valObj) return parseFloat(valObj.doubleValue);
    if ('booleanValue' in valObj) return valObj.booleanValue;
    if ('nullValue' in valObj) return null;
    if ('timestampValue' in valObj) return valObj.timestampValue;
    if ('arrayValue' in valObj) {
        const values = valObj.arrayValue.values || [];
        return values.map(fromFirestoreValue);
    }
    if ('mapValue' in valObj) {
        const res = {};
        const fields = valObj.mapValue.fields || {};
        for (const [k, v] of Object.entries(fields)) {
            res[k] = fromFirestoreValue(v);
        }
        return res;
    }
    return null;
}

function fromFirestoreDoc(doc) {
    if (!doc) return null;
    const res = {};
    if (doc.fields) {
        for (const [k, v] of Object.entries(doc.fields)) {
            res[k] = fromFirestoreValue(v);
        }
    }
    if (doc.name) {
        const parts = doc.name.split('/');
        res.id = parts[parts.length - 1];
    }
    return res;
}

class FirestoreDocRef {
    constructor(collectionPath, docId, client) {
        this.collectionPath = collectionPath;
        this.docId = docId;
        this.client = client;
    }

    async update(data) {
        return this.set(data, { merge: true });
    }

    async get() {
        const url = `${this.client.baseUrl}/${this.collectionPath}/${encodeURIComponent(this.docId)}?key=${this.client.apiKey}`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 404) {
                    return {
                        exists: false,
                        id: this.docId,
                        data: () => null
                    };
                }
                const errText = await res.text();
                throw new Error(`Firestore GET failed (${res.status}): ${errText}`);
            }
            const data = await res.json();
            const parsed = fromFirestoreDoc(data);
            return {
                exists: true,
                id: this.docId,
                data: () => parsed
            };
        } catch (err) {
            return {
                exists: false,
                id: this.docId,
                data: () => null,
                error: err.message
            };
        }
    }

    async set(data, options = {}) {
        const fields = {};
        for (const [k, v] of Object.entries(data)) {
            if (v !== undefined) {
                fields[k] = toFirestoreValue(v);
            }
        }

        // Check if merge or replace
        let url = `${this.client.baseUrl}/${this.collectionPath}/${encodeURIComponent(this.docId)}?key=${this.client.apiKey}`;
        if (options && options.merge) {
            const fieldMasks = Object.keys(data).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
            if (fieldMasks) {
                url += `&${fieldMasks}`;
            }
        }

        const res = await fetch(url, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields })
        });

        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Firestore SET failed (${res.status}): ${errText}`);
        }
        const respData = await res.json();
        return fromFirestoreDoc(respData);
    }

    async delete() {
        const url = `${this.client.baseUrl}/${this.collectionPath}/${encodeURIComponent(this.docId)}?key=${this.client.apiKey}`;
        const res = await fetch(url, { method: 'DELETE' });
        return res.ok;
    }
}

class FirestoreQuery {
    constructor(collectionPath, client) {
        this.collectionPath = collectionPath;
        this.client = client;
        this.whereFilters = [];
        this.orderRules = [];
        this.limitCount = null;
    }

    where(field, op, val) {
        const q = new FirestoreQuery(this.collectionPath, this.client);
        q.whereFilters = [...this.whereFilters, { field, op, val }];
        q.orderRules = [...this.orderRules];
        q.limitCount = this.limitCount;
        return q;
    }

    orderBy(field, direction = 'asc') {
        const q = new FirestoreQuery(this.collectionPath, this.client);
        q.whereFilters = [...this.whereFilters];
        q.orderRules = [...this.orderRules, { field, direction: direction.toLowerCase() }];
        q.limitCount = this.limitCount;
        return q;
    }

    limit(n) {
        const q = new FirestoreQuery(this.collectionPath, this.client);
        q.whereFilters = [...this.whereFilters];
        q.orderRules = [...this.orderRules];
        q.limitCount = n;
        return q;
    }

    async get() {
        // If simple collection query with no where / order / limit, use listDocuments
        if (this.whereFilters.length === 0 && this.orderRules.length === 0 && !this.limitCount) {
            const url = `${this.client.baseUrl}/${this.collectionPath}?pageSize=300&key=${this.client.apiKey}`;
            try {
                const res = await fetch(url);
                if (!res.ok) {
                    return { empty: true, size: 0, forEach: () => {}, docs: [] };
                }
                const data = await res.json();
                const documents = data.documents || [];
                const docs = documents.map(d => {
                    const parsed = fromFirestoreDoc(d);
                    return {
                        id: parsed ? parsed.id : '',
                        data: () => parsed
                    };
                });
                return {
                    empty: docs.length === 0,
                    size: docs.length,
                    docs: docs,
                    forEach: (cb) => docs.forEach(cb)
                };
            } catch (e) {
                return { empty: true, size: 0, forEach: () => {}, docs: [] };
            }
        }

        // Use runQuery for complex where/order/limit queries
        const runQueryUrl = `https://firestore.googleapis.com/v1/projects/${this.client.projectId}/databases/(default)/documents:runQuery?key=${this.client.apiKey}`;
        const structuredQuery = {
            from: [{ collectionId: this.collectionPath }]
        };

        if (this.whereFilters.length > 0) {
            const filters = this.whereFilters.map(f => {
                let opCode = 'EQUAL';
                if (f.op === '==' || f.op === '=') opCode = 'EQUAL';
                else if (f.op === '>') opCode = 'GREATER_THAN';
                else if (f.op === '>=') opCode = 'GREATER_THAN_OR_EQUAL';
                else if (f.op === '<') opCode = 'LESS_THAN';
                else if (f.op === '<=') opCode = 'LESS_THAN_OR_EQUAL';

                return {
                    fieldFilter: {
                        field: { fieldPath: f.field },
                        op: opCode,
                        value: toFirestoreValue(f.val)
                    }
                };
            });

            if (filters.length === 1) {
                structuredQuery.where = filters[0];
            } else {
                structuredQuery.where = {
                    compositeFilter: {
                        op: 'AND',
                        filters: filters
                    }
                };
            }
        }

        if (this.orderRules.length > 0) {
            structuredQuery.orderBy = this.orderRules.map(r => ({
                field: { fieldPath: r.field },
                direction: r.direction === 'desc' ? 'DESCENDING' : 'ASCENDING'
            }));
        }

        if (this.limitCount) {
            structuredQuery.limit = this.limitCount;
        }

        try {
            const res = await fetch(runQueryUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ structuredQuery })
            });

            if (!res.ok) {
                // Fallback to basic list and memory filter if index is missing or structuredQuery fails
                return this.fallbackFilter();
            }

            const results = await res.json();
            const docs = [];
            for (const r of results) {
                if (r.document) {
                    const parsed = fromFirestoreDoc(r.document);
                    docs.push({
                        id: parsed ? parsed.id : '',
                        data: () => parsed
                    });
                }
            }
            return {
                empty: docs.length === 0,
                size: docs.length,
                docs: docs,
                forEach: (cb) => docs.forEach(cb)
            };
        } catch (e) {
            return this.fallbackFilter();
        }
    }

    async fallbackFilter() {
        const url = `${this.client.baseUrl}/${this.collectionPath}?pageSize=300&key=${this.client.apiKey}`;
        try {
            const res = await fetch(url);
            if (!res.ok) return { empty: true, size: 0, forEach: () => {}, docs: [] };
            const data = await res.json();
            const documents = data.documents || [];
            let items = documents.map(d => fromFirestoreDoc(d)).filter(Boolean);

            // Apply where filters in memory
            for (const f of this.whereFilters) {
                items = items.filter(it => {
                    if (f.op === '==' || f.op === '=') return it[f.field] === f.val;
                    if (f.op === '>') return it[f.field] > f.val;
                    if (f.op === '>=') return it[f.field] >= f.val;
                    if (f.op === '<') return it[f.field] < f.val;
                    if (f.op === '<=') return it[f.field] <= f.val;
                    return true;
                });
            }

            // Apply order
            for (const r of this.orderRules) {
                items.sort((a, b) => {
                    const valA = a[r.field];
                    const valB = b[r.field];
                    if (valA < valB) return r.direction === 'desc' ? 1 : -1;
                    if (valA > valB) return r.direction === 'desc' ? -1 : 1;
                    return 0;
                });
            }

            if (this.limitCount && items.length > this.limitCount) {
                items = items.slice(0, this.limitCount);
            }

            const docs = items.map(parsed => ({
                id: parsed.id,
                data: () => parsed
            }));

            return {
                empty: docs.length === 0,
                size: docs.length,
                docs: docs,
                forEach: (cb) => docs.forEach(cb)
            };
        } catch (err) {
            return { empty: true, size: 0, forEach: () => {}, docs: [] };
        }
    }
}

class FirestoreCollectionRef extends FirestoreQuery {
    constructor(collectionPath, client) {
        super(collectionPath, client);
    }

    doc(docId) {
        return new FirestoreDocRef(this.collectionPath, docId, this.client);
    }

    async add(data) {
        const url = `${this.client.baseUrl}/${this.collectionPath}?key=${this.client.apiKey}`;
        const fields = {};
        for (const [k, v] of Object.entries(data)) {
            if (v !== undefined) {
                fields[k] = toFirestoreValue(v);
            }
        }
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fields })
        });
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(`Firestore ADD failed (${res.status}): ${errText}`);
        }
        const respData = await res.json();
        const parsed = fromFirestoreDoc(respData);
        return {
            id: parsed ? parsed.id : '',
            data: () => parsed
        };
    }
}

class FirestoreRESTClient {
    constructor() {
        const config = getFirebaseConfig();
        if (!config || !config.projectId) {
            this.initialized = false;
            return;
        }
        this.projectId = config.projectId;
        this.apiKey = config.apiKey;
        this.baseUrl = `https://firestore.googleapis.com/v1/projects/${this.projectId}/databases/(default)/documents`;
        this.initialized = true;
    }

    collection(collectionPath) {
        return new FirestoreCollectionRef(collectionPath, this);
    }
}

const firestoreClient = new FirestoreRESTClient();

module.exports = {
    firestoreClient,
    FirestoreRESTClient
};
