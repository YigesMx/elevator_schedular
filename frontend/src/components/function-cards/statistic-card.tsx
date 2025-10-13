import { useState, useEffect, useContext } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import WindowCard from "@/components/custom-ui/window-card"

import { SceneDataContext } from '@/contexts_and_type';
import { statisticStackNum } from '@/contexts_and_type';

const chartConfig = {
  waiting: {
    label: "waiting",
    color: "var(--chart-1)",
  },
  inElevator: {
    label: "inElevator",
    color: "var(--chart-3)",
  },
  arrived: {
    label: "arrived",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

type StatisticType = "overall" | "waiting" | "arrived" | "inElevator";


interface StatisticCardProps {
    defaultTab: StatisticType;
}
function StatisticCard({defaultTab}: StatisticCardProps) {

    const sceneData = useContext(SceneDataContext);
    const [statisticData, setStatisticData] = useState<Array<{timeCost: string, waiting: number, arrived: number}>>([]);

    useEffect(() => {
        const timeStart = 10;
        const timeEnd = 90;
        const timeStep = (timeEnd - timeStart) / (statisticStackNum-2);
        // generate array like [5, 7.5, 10, ..., 45]
        const timeArray = Array.from({ length: statisticStackNum }, (_, i) => +(timeStart + i * timeStep).toFixed(1));
        
        const currentTick = sceneData?.scene?.current.tick || 0;

        if (sceneData?.scene) {
            const scene_to_display = sceneData.status === 'updating' ? sceneData.scene : (sceneData.prev_scene ? sceneData.prev_scene : sceneData.scene);
            const passengers = Object.values(scene_to_display.passengers);
            // 统计每个时间段的waiting和arrived数量，0~timeStart, timeStart~timeStart+timeStep, ..., timeEnd~infinity
            const newStatisticData = timeArray.map((time, index) => {
                const lowerBound = index === 0 ? 0 : timeArray[index - 1];
                const upperBound = index === statisticStackNum - 1 ? Infinity : time;
                const waitingCount = passengers.filter(p => {
                    const cost = currentTick - p.arrive_tick;
                    return p.status === 'waiting' && cost >= lowerBound && cost < upperBound;
                }).length;
                const inElevatorCount = passengers.filter(p => {
                    const cost = currentTick - p.arrive_tick;
                    return p.status === 'in_elevator' && cost >= lowerBound && cost < upperBound;
                }).length;
                const arrivedCount = passengers.filter(p => {
                    const cost = (p.dropoff_tick || currentTick) - p.arrive_tick;
                    return p.status === 'arrived' && cost >= lowerBound && cost < upperBound;
                }).length;
                return {
                    timeCost: index === statisticStackNum - 1 ? `>${timeArray[statisticStackNum - 2]}` : `<${time}`,
                    waiting: waitingCount,
                    inElevator: inElevatorCount,
                    arrived: arrivedCount,
                };
            });
            setStatisticData(newStatisticData);
        } else {
            setStatisticData([]);
        }
        

    }, [sceneData]);

    const [ selectedTab, setSelectedTab ] = useState(defaultTab);

    const actionNode = (
        <Tabs defaultValue={"overall"} value={selectedTab} onValueChange={(value) => setSelectedTab(value as StatisticType)}>
            <TabsList>
                <TabsTrigger value="overall">Overall</TabsTrigger>
                <TabsTrigger value="waiting">Waiting</TabsTrigger>
                <TabsTrigger value="inElevator">In Elevator</TabsTrigger>
                <TabsTrigger value="arrived">Arrived</TabsTrigger>
            </TabsList>
        </Tabs>
    )

    return (
        <WindowCard title="Passenger Statistic" action={actionNode}>
            {
                
                <ChartContainer config={chartConfig} className="h-full w-full">
                    <BarChart accessibilityLayer data={statisticData}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="timeCost"
                            tickLine={false}
                            tickMargin={10}
                            axisLine={false}
                            // tickFormatter={(value) => value.slice(0, 3)}
                        />
                        <ChartTooltip
                            cursor={true}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        {
                            selectedTab === "overall" ? (
                            [
                                <Bar
                                    key="arrived"
                                    dataKey="arrived"
                                    stackId="a"
                                    fill="var(--color-arrived)"
                                    // radius={[0, 0, 4, 4]}
                                />,
                                <Bar
                                    key="inElevator"
                                    dataKey="inElevator"
                                    stackId="a"
                                    fill="var(--color-inElevator)"
                                    // radius={[0, 0, 0, 0]}
                                />,
                                <Bar
                                    key="waiting"
                                    dataKey="waiting"
                                    stackId="a"
                                    fill="var(--color-waiting)"
                                    // radius={[4, 4, 0, 0]}
                                />
                            ]
                            ) : selectedTab === "waiting" ? (
                            <Bar dataKey="waiting" fill="var(--color-waiting)" />
                            ) : selectedTab === "inElevator" ? (
                            <Bar dataKey="inElevator" fill="var(--color-inElevator)" />
                            ) : selectedTab === "arrived" ? (
                            <Bar dataKey="arrived" fill="var(--color-arrived)" />
                            ) : null
                        }
                    </BarChart>
                </ChartContainer>
            }
        </WindowCard>
    )
}

export default StatisticCard
