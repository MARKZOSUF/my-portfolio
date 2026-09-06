import { Card } from '@/components/ui/Card'; import { Text } from '@/components/ui/Text';
export function StatCard({label,value,detail}:{label:string;value:string;detail:string}){return <Card style={{flex:1,minWidth:145}}><Text variant="caption" muted>{label}</Text><Text variant="title">{value}</Text><Text variant="caption" muted>{detail}</Text></Card>}
