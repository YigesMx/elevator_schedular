import { useState, useEffect, useContext, useRef } from "react"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import WindowCard from "@/components/custom-ui/window-card"

import { MetricsDataContext, LogsDataContext} from '@/contexts_and_type';


type InfoType = "metrics" | "logs";

interface InfoCardProps {
    defaultTab: InfoType;
}
function InfoCard({defaultTab}: InfoCardProps) {

    const metricsData = useContext(MetricsDataContext);
    const logsData = useContext(LogsDataContext);

    const [ selectedTab, setSelectedTab ] = useState(defaultTab);
    const logsContainerRef = useRef<HTMLDivElement>(null);
    
    // 自动滚动到底部（仅当距离底部100px内时）
    useEffect(() => {
        if (selectedTab === "logs" && logsContainerRef.current) {
            const container = logsContainerRef.current;
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight <= 100;
            
            if (isNearBottom) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [logsData, selectedTab]);

    useEffect(() => {
        if (selectedTab === "logs" && logsContainerRef.current) {
            const container = logsContainerRef.current;
            container.scrollTop = container.scrollHeight;
        }
    }, [selectedTab]);

    const actionNode = (
        <Tabs defaultValue={"metrics"} value={selectedTab} onValueChange={(value) => setSelectedTab(value as InfoType)}>
            <TabsList>
                <TabsTrigger value="metrics">Metrics</TabsTrigger>
                <TabsTrigger value="logs">Logs</TabsTrigger>
            </TabsList>
        </Tabs>
    )

    return (
        <WindowCard title="Info" action={actionNode}>
            {
            selectedTab === "metrics" ? (
                metricsData ? (
                <div className="overflow-hidden rounded-md border">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="h-8">Metric</TableHead>
                            <TableHead className="h-8">Value</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {Object.entries(metricsData).map(([key, value]) => (
                            <TableRow key={key}>
                            <TableCell className="font-medium h-6 py-1">{key}</TableCell>
                            <TableCell className="h-6 py-1">
                                {(() => {
                                    const num = typeof value === 'number' ? value : Number(value);
                                    if (Number.isFinite(num)) {
                                        return Number.isInteger(num) ? String(num) : num.toFixed(2);
                                    }
                                    return String(value);
                                })()}
                            </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                </div>
                ) : (
                <p>No metrics data available.</p>
                )
            ) : (
                <div 
                ref={logsContainerRef}
                className="h-full overflow-auto"
                >
                {logsData.length === 0 ? (
                    <p>No logs available.</p>
                ) : (
                    <div>
                    {logsData.map((log, index) => (
                        <div key={index}>
                        <pre className="whitespace-pre-wrap break-words text-sm">{log}</pre>
                        {index < logsData.length - 1 && (
                            <hr className="my-2" style={{ borderColor: 'var(--border)' }} />
                        )}
                        </div>
                    ))}
                    </div>
                )}
                </div>
            )
            }
        </WindowCard>
    )
}

export default InfoCard;
