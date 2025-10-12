import { useState } from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import StatisticCard from "@/components/function/statistic-card";
import SceneCard from "@/components/function/scene-card";

import { LayoutChangeTriggerContext } from "@/contexts_and_type";

const ReactGridLayout = WidthProvider(RGL);

function Body() {
    const [layoutChangeTrigger, setLayoutChangeTrigger] = useState(false);
    const layout = [
        { i: "a", x: 0, y: 0, w: 9, h: 12, minW: 8, minH: 10 },
        { i: "b", x: 9, y: 0, w: 6, h: 6, minW: 4, minH: 6 },
        { i: "c", x: 9, y: 6, w: 6, h: 6, minW: 4, minH: 6 }
    ];
    return (
        <LayoutChangeTriggerContext.Provider value={layoutChangeTrigger}>
            <ReactGridLayout
                className="layout"
                layout={layout}
                cols={15}
                rowHeight={50}
                draggableHandle=".drag-handle"
                onLayoutChange={() => setLayoutChangeTrigger((prev) => !prev)}
            // width={1800}
            >
                <div key="a">
                    <SceneCard />
                </div>
                <div key="b">
                    <StatisticCard defaultTab="overall" />
                </div>
                <div key="c">
                    <StatisticCard defaultTab="waiting" />
                </div>
            </ReactGridLayout>
        </LayoutChangeTriggerContext.Provider>
    );
}

export default Body
