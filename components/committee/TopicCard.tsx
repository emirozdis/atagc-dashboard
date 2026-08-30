import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Info } from "lucide-react";

interface TopicCardProps {
	topic?: { title: string; description: string } | null;
	isLoading?: boolean;
}

export const TopicCard = ({ topic, isLoading }: TopicCardProps) => (
	<Card className="group relative overflow-hidden bg-card border-border/50 shadow-sm flex flex-col h-full min-h-[250px] transition-all hover:shadow-md hover:border-primary/20">
		<div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none" />

		<CardHeader className="pb-4 relative z-10">
			<div className="flex items-center justify-between mb-3">
				<div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase shadow-sm">
					<FileText className="w-3.5 h-3.5" />
					Agenda
				</div>
				{!topic && (
					<Badge variant="secondary" className="text-[10px] bg-muted/80 text-muted-foreground hover:bg-muted font-normal">
					Waiting
					</Badge>
				)}
			</div>
			<CardTitle className="text-2xl md:text-3xl font-display font-bold leading-tight text-foreground tracking-tight">
				{isLoading ? <Skeleton className="h-9 w-3/4" /> : (topic?.title || "Agenda not set")}
			</CardTitle>
		</CardHeader>
		<CardContent className="flex-grow relative z-10">
			{isLoading ? (
				<div className="space-y-3">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-4 w-2/3" />
				</div>
			) : topic ? (
				<div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-base">
					{topic.description}
				</div>
			) : (
				<div className="flex flex-col items-center justify-center h-full py-12 text-center">
					<div className="w-12 h-12 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
						<Info className="w-6 h-6 text-muted-foreground/40" />
					</div>
					<p className="text-muted-foreground font-medium">No topic has been added yet.</p>
					<p className="text-xs text-muted-foreground/60 mt-1">The committee chair will set the agenda.</p>
				</div>
			)}
		</CardContent>
	</Card>
);
