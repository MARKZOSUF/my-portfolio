export const light = {
  canvas:'#FFFFFF', surface:'#F9F8F7', raised:'#FFFFFF', text:'#2C2C2B', muted:'#6E6B66', border:'#E6E5E3',
  primary:'#2783DE', primarySoft:'#E5F2FC', positive:'#46A171', positiveSoft:'#E8F1EC', attention:'#D5803B', attentionSoft:'#FBEBDE', danger:'#E56458', dangerSoft:'#FCE9E7'
};
export const dark = {
  canvas:'#191919', surface:'#202020', raised:'#282828', text:'#FFFFFF', muted:'#B2B0AC', border:'#444441',
  primary:'#5E9FE8', primarySoft:'#203548', positive:'#72BC8F', positiveSoft:'#24392C', attention:'#DE9255', attentionSoft:'#453323', danger:'#E97366', dangerSoft:'#472725'
};
export const spacing = { xs:4, sm:8, md:12, lg:16, xl:24, xxl:32, xxxl:48 } as const;
export const radius = { sm:8, md:12, lg:18, round:999 } as const;
export const type = { caption:13, body:16, subtitle:18, title:24, display:32 } as const;
export type Theme = typeof light;
