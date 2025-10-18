import { useState } from "react";
import RGL, { WidthProvider } from "react-grid-layout";
import StatisticCard from "@/components/function-cards/statistic-card";
import SceneCard from "@/components/function-cards/scene-card";
import InfoCard from "@/components/function-cards/info-card";

import { LayoutChangeTriggerContext } from "@/contexts_and_type";

const ReactGridLayout = WidthProvider(RGL);

function Body() {
    const [layoutChangeTrigger, setLayoutChangeTrigger] = useState(false);
    const layout = [
        { i: "a", x: 0, y: 0, w: 10, h: 18, minW: 8, minH: 10 },
        { i: "b", x: 10, y: 0, w: 5, h: 6, minW: 5, minH: 6 },
        { i: "c", x: 10, y: 6, w: 5, h: 6, minW: 5, minH: 6 }
    ];
    return (
        <LayoutChangeTriggerContext value={layoutChangeTrigger}>
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
                    <InfoCard defaultTab="metrics" />
                </div>
            </ReactGridLayout>
        </LayoutChangeTriggerContext>
    );
}

export default Body
