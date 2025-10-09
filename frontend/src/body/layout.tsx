import RGL, { WidthProvider } from "react-grid-layout";
import StatisticCard from "@/components/function/statistic";
import SceneCard from "@/components/function/scene";

const ReactGridLayout = WidthProvider(RGL);

function Body() {
    const layout = [
        { i: "a", x: 0, y: 0, w: 9, h: 12 },
        { i: "b", x: 9, y: 0, w: 6, h: 6, minW: 2, minH: 6 },
        { i: "c", x: 9, y: 6, w: 6, h: 6 }
    ];
    return (
        <ReactGridLayout
            className="layout"
            layout={layout}
            cols={15}
            rowHeight={50}
            draggableHandle=".drag-handle"
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
    );
}

export default Body
