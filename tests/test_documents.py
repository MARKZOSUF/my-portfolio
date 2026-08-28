import io,os
def test_txt_upload_delete(client,user,app):
    r=client.post("/api/documents/upload",data={"file":(io.BytesIO(b"UNIT 1\nDatabase concepts\nKeys"),"syllabus.txt","text/plain")},content_type="multipart/form-data"); assert r.status_code==201; pid=r.json["document"]["id"]
    assert client.get("/api/documents").json["pagination"]["total"]==1
    assert client.delete("/api/documents/"+pid).status_code==200
    assert not os.listdir(app.config["UPLOAD_FOLDER"])
def test_invalid_signature(client,user): assert client.post("/api/documents/upload",data={"file":(io.BytesIO(b"not pdf"),"x.pdf","application/pdf")},content_type="multipart/form-data").status_code==415
def test_unsafe_extension(client,user): assert client.post("/api/documents/upload",data={"file":(io.BytesIO(b"x"),"x.exe")},content_type="multipart/form-data").status_code==415
