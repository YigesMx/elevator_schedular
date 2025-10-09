import {Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle} from "@/components/ui/card"
import { Handle } from "@/components/custom-ui/handle"

interface WindowCardProps {
    title: React.ReactNode;
    description?: React.ReactNode;
    action?: React.ReactNode;
    footer?: React.ReactNode;
    children?: React.ReactNode;
}

function WindowCard({title, description, action, footer, children}: WindowCardProps) {
    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="flex-shrink-0">
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
                <CardAction>
                    <div className="flex justify-between items-center w-full gap-4">
                        <>
                            {action}
                        </>
                        <Handle/>
                    </div>
                </CardAction>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto">
                {children}
            </CardContent>
            {footer &&
                <CardFooter className="flex-shrink-0">
                    {footer}
                </CardFooter>
            }
        </Card>
    )
}

export default WindowCard;