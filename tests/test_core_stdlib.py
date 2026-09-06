import importlib.util,sys,unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def load(name,path):
 spec=importlib.util.spec_from_file_location(name,ROOT/path);module=importlib.util.module_from_spec(spec);sys.modules[name]=module;spec.loader.exec_module(module);return module
chunker=load('chunker','backend/app/search/chunker.py');spaced=load('spaced','backend/app/learning/spaced_repetition.py');validators=load('validators','backend/app/ai/evaluation/validators.py')
class Core(unittest.TestCase):
 def test_chunking(self):self.assertGreater(len(chunker.chunk_text('Sentence. '*1000,400,40)),2)
 def test_schedule(self):self.assertEqual(spaced.schedule(20,2.5,5,1).interval_days,1)
 def test_evidence_warning(self):self.assertTrue(validators.evaluate_output('Detailed framework. '*20,'research',0).warnings)
if __name__=='__main__':unittest.main()
