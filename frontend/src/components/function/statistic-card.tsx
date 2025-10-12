import { useState } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"
import type { ChartConfig } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts"

import WindowCard from "@/components/custom-ui/window-card"

const statisticData = [
    { timeCost: "<5", waiting: 6, arrived: 1},
    { timeCost: "5~10", waiting: 7, arrived: 3},
    { timeCost: "10~15", waiting: 12, arrived: 6},
    { timeCost: "15~20", waiting: 11, arrived: 5},
    { timeCost: "20~25", waiting: 13, arrived: 7},
    { timeCost: "25~30", waiting: 10, arrived: 3},
    { timeCost: "30~35", waiting: 6, arrived: 1},
    { timeCost: "35~40", waiting: 5, arrived: 0},
    { timeCost: ">40", waiting: 2, arrived: 0},
]

const chartConfig = {
  waiting: {
    label: "waiting",
    color: "var(--chart-1)",
  },
  arrived: {
    label: "arrived",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

type StatisticType = "overall" | "waiting" | "arrived";

interface StatisticCardProps {
    defaultTab: StatisticType;
}

function StatisticCard({defaultTab}: StatisticCardProps) {
    const [ selectedTab, setSelectedTab ] = useState(defaultTab);

    const actionNode = (
        <Tabs defaultValue={"overall"} value={selectedTab} onValueChange={(value) => setSelectedTab(value as StatisticType)}>
            <TabsList>
                <TabsTrigger value="overall">Overall</TabsTrigger>
                <TabsTrigger value="waiting">Waiting</TabsTrigger>
                <TabsTrigger value="arrived">Arrived</TabsTrigger>
            </TabsList>
        </Tabs>
    )

    return (
        <WindowCard title="Passenger Statistic" action={actionNode}>
            {
                selectedTab === "overall" ? (
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
                            <Bar
                                dataKey="arrived"
                                stackId="a"
                                fill="var(--color-arrived)"
                                radius={[0, 0, 4, 4]}
                                />
                            <Bar
                                dataKey="waiting"
                                stackId="a"
                                fill="var(--color-waiting)"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ChartContainer>
                ) : selectedTab === "waiting" ? (
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
                            <Bar dataKey="waiting" fill="var(--color-waiting)" radius={8} />
                        </BarChart>
                    </ChartContainer>
                ) : selectedTab === "arrived" ? (
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
                            <Bar dataKey="arrived" fill="var(--color-arrived)" radius={8} />
                        </BarChart>
                    </ChartContainer>
                ) : null
            }
        </WindowCard>
    )
}

export default StatisticCard
