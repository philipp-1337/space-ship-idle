// Uniform-grid Broad-Phase für Kreis-Kollisionsabfragen. Statt jedes Objekt
// gegen jedes andere zu prüfen (O(N*M), der Haupt-Skalierungskiller bei vielen
// Gegnern), werden Entitäten nach Zelle einsortiert; eine Umkreis-Abfrage
// besucht nur die überlappenden Zellen. queryRadius liefert Kandidaten aus
// diesen Zellen zurück — der Aufrufer macht danach weiterhin den exakten
// Distanz-/Hitbox-Check, das Grid filtert nur grob vor.
export default class SpatialGrid {
    constructor(cellSize) {
        this.cellSize = cellSize;
        this.cells = new Map();
    }

    clear() {
        this.cells.clear();
    }

    _key(cx, cy) {
        return cx + ',' + cy;
    }

    insert(entity) {
        const cx = Math.floor(entity.x / this.cellSize);
        const cy = Math.floor(entity.y / this.cellSize);
        const key = this._key(cx, cy);
        let bucket = this.cells.get(key);
        if (!bucket) {
            bucket = [];
            this.cells.set(key, bucket);
        }
        bucket.push(entity);
    }

    queryRadius(x, y, radius) {
        const minCx = Math.floor((x - radius) / this.cellSize);
        const maxCx = Math.floor((x + radius) / this.cellSize);
        const minCy = Math.floor((y - radius) / this.cellSize);
        const maxCy = Math.floor((y + radius) / this.cellSize);
        const results = [];
        for (let cx = minCx; cx <= maxCx; cx++) {
            for (let cy = minCy; cy <= maxCy; cy++) {
                const bucket = this.cells.get(this._key(cx, cy));
                if (bucket) {
                    for (const entity of bucket) results.push(entity);
                }
            }
        }
        return results;
    }
}
