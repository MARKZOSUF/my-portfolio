import {create} from 'zustand';type Theme='light'|'dark'|'system';type Language='English'|'हिन्दी'|'Hinglish';
interface S{theme:Theme;language:Language;reducedMotion:boolean;setTheme:(x:Theme)=>void;setLanguage:(x:Language)=>void;setReducedMotion:(x:boolean)=>void}
export const usePreferencesStore=create<S>(set=>({theme:'system',language:'English',reducedMotion:false,setTheme:theme=>set({theme}),setLanguage:language=>set({language}),setReducedMotion:reducedMotion=>set({reducedMotion})}));
