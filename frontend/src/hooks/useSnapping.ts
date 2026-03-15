import Konva from 'konva';

const GUIDELINE_OFFSET = 5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getLineGuideStops(skipNode: any, stage: Konva.Stage | null) {
    if (!stage) return { vertical: [], horizontal: [] };
    // we can snap to stage borders and the center of the stage
    const vertical = [0, stage.width() / 2, stage.width()];
    const horizontal = [0, stage.height() / 2, stage.height()];

    // and we snap over edges and center of each object on the canvas
    stage.find('.object').forEach((guideItem) => {
        if (guideItem === skipNode) {
            return;
        }
        const box = guideItem.getClientRect();
        // and we can snap to all edges of shapes
        vertical.push(box.x, box.x + box.width, box.x + box.width / 2);
        horizontal.push(box.y, box.y + box.height, box.y + box.height / 2);
    });
    return {
        vertical,
        horizontal,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getObjectSnappingEdges(node: any) {
    const box = node.getClientRect();
    const absPos = node.absolutePosition();

    return {
        vertical: [
            {
                guide: Math.round(box.x),
                offset: Math.round(absPos.x - box.x),
                snap: 'start',
            },
            {
                guide: Math.round(box.x + box.width / 2),
                offset: Math.round(absPos.x - box.x - box.width / 2),
                snap: 'center',
            },
            {
                guide: Math.round(box.x + box.width),
                offset: Math.round(absPos.x - box.x - box.width),
                snap: 'end',
            },
        ],
        horizontal: [
            {
                guide: Math.round(box.y),
                offset: Math.round(absPos.y - box.y),
                snap: 'start',
            },
            {
                guide: Math.round(box.y + box.height / 2),
                offset: Math.round(absPos.y - box.y - box.height / 2),
                snap: 'center',
            },
            {
                guide: Math.round(box.y + box.height),
                offset: Math.round(absPos.y - box.y - box.height),
                snap: 'end',
            },
        ],
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getGuides(lineGuideStops: any, itemBounds: any) {
    const resultV: {lineGuide: number, diff: number, snap: string, offset: number}[] = [];
    const resultH: {lineGuide: number, diff: number, snap: string, offset: number}[] = [];

    lineGuideStops.vertical.forEach((lineGuide: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        itemBounds.vertical.forEach((itemBound: any) => {
            const diff = Math.abs(lineGuide - itemBound.guide);
            if (diff < GUIDELINE_OFFSET) {
                resultV.push({
                    lineGuide: lineGuide,
                    diff: diff,
                    snap: itemBound.snap,
                    offset: itemBound.offset,
                });
            }
        });
    });

    lineGuideStops.horizontal.forEach((lineGuide: number) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        itemBounds.horizontal.forEach((itemBound: any) => {
            const diff = Math.abs(lineGuide - itemBound.guide);
            if (diff < GUIDELINE_OFFSET) {
                resultH.push({
                    lineGuide: lineGuide,
                    diff: diff,
                    snap: itemBound.snap,
                    offset: itemBound.offset,
                });
            }
        });
    });

    const guides = [];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const minV = resultV.sort((a: any, b: any) => a.diff - b.diff)[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const minH = resultH.sort((a: any, b: any) => a.diff - b.diff)[0];
    if (minV) {
        guides.push({
            lineGuide: minV.lineGuide,
            offset: minV.offset,
            orientation: 'V',
            snap: minV.snap,
        });
    }
    if (minH) {
        guides.push({
            lineGuide: minH.lineGuide,
            offset: minH.offset,
            orientation: 'H',
            snap: minH.snap,
        });
    }
    return guides;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function drawGuides(guides: any[], layer: Konva.Layer) {
    if (!layer) return;
    guides.forEach((lg) => {
        if (lg.orientation === 'H') {
            const line = new Konva.Line({
                points: [-6000, 0, 6000, 0],
                stroke: 'rgb(0, 161, 255)',
                strokeWidth: 1.5,
                name: 'guid-line',
                dash: [4, 6],
            });
            layer.add(line);
            line.absolutePosition({
                x: 0,
                y: lg.lineGuide,
            });
        } else if (lg.orientation === 'V') {
            const line = new Konva.Line({
                points: [0, -6000, 0, 6000],
                stroke: 'rgb(0, 161, 255)',
                strokeWidth: 1.5,
                name: 'guid-line',
                dash: [4, 6],
            });
            layer.add(line);
            line.absolutePosition({
                x: lg.lineGuide,
                y: 0,
            });
        }
    });
}
