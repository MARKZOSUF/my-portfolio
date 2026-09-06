import type { PropsWithChildren } from 'react'; import { StyleSheet, View, ViewProps } from 'react-native'; import { useTheme } from '@/theme/useTheme';
export function Card({children,style,...rest}:PropsWithChildren<ViewProps>){const c=useTheme();return <View style={[s.card,{backgroundColor:c.raised,borderColor:c.border},style]} {...rest}>{children}</View>};
const s=StyleSheet.create({card:{borderWidth:1,borderRadius:14,padding:16,gap:10}});
