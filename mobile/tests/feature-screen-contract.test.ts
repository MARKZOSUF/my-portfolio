import type {FeatureScreenProps} from '@/features/feature/FeatureScreen';
const value:FeatureScreenProps={kind:'numericals',title:'Numericals',inputLabel:'Problem'};test('accepts typed inputLabel',()=>expect(value.inputLabel).toBe('Problem'));
