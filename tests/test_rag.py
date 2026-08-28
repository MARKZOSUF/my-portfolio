from services.rag.engine import LocalVectorStore
def test_local_rag():
    s=LocalVectorStore(); s.add([("normalization reduces database redundancy","[1]"),("chlorophyll absorbs light","[2]")]); assert s.search("database normalization",1)[0].source_label=="[1]"
