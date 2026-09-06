import * as Notifications from 'expo-notifications';
Notifications.setNotificationHandler({handleNotification:async()=>({shouldShowBanner:true,shouldShowList:true,shouldPlaySound:false,shouldSetBadge:false})});
export async function requestNotifications(){const current=await Notifications.getPermissionsAsync();if(current.status==='granted')return true;const next=await Notifications.requestPermissionsAsync();return next.status==='granted';}
export async function scheduleRevision(title:string,date:Date){return Notifications.scheduleNotificationAsync({content:{title:'Revision time',body:`Review ${title}`,data:{route:'/revision'}},trigger:{type:Notifications.SchedulableTriggerInputTypes.DATE,date}})}
