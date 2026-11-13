#!/usr/bin/env python3
"""Build a normalized catalog from the community-maintained upstream data."""
import json, pathlib, subprocess, tempfile, shutil
UPSTREAM="https://github.com/Vociferix/ptcgp-data.git"
OUT=pathlib.Path("data/cards.json")
def read(p): return json.loads(p.read_text(encoding="utf-8"))
def main():
    tmp=pathlib.Path(tempfile.mkdtemp(prefix="ptcgp-data-"))
    try:
        subprocess.run(["git","clone","--depth","1",UPSTREAM,str(tmp/"src")],check=True,stdout=subprocess.DEVNULL)
        root=tmp/"src"/"data"; sets=read(root/"sets.json")
        rarities={x["code"]:x["name"] for x in read(root/"rarities.json")}
        base={}
        for p in (root/"cards").glob("*.json"):
            c=read(p); base[int(c["id"])]=c
        cards=[]
        for folder in (root/"card_versions").iterdir():
            if not folder.is_dir(): continue
            setcode=folder.name; si=next((s for s in sets if s["code"]==setcode),{})
            for p in folder.glob("*.json"):
                v=read(p); c=base.get(int(v["card_id"]))
                if not c: raise ValueError("Missing abstract card "+str(v["card_id"]))
                n=int(v["number"])
                cards.append({"id":f"{setcode}-{n:03d}","card_id":int(c["id"]),"name":c["name"],"card_type":c.get("card_type","pokemon"),"natdex_number":c.get("natdex_number"),"element":c.get("element"),"stage":c.get("stage"),"hp":c.get("hp"),"is_ex":c.get("is_ex",False),"is_mega":c.get("is_mega",False),"set":setcode,"set_name":si.get("name",setcode),"number":n,"number_label":f"{n:03d}","rarity":v.get("rarity"),"rarity_name":rarities.get(v.get("rarity"),v.get("rarity") or "Promo"),"illustrator":v.get("illustrator"),"is_promo":v.get("is_promo",False),"is_foil":v.get("is_foil",False),"is_reprint":v.get("is_reprint",False),"is_tradable":v.get("is_tradable",False),"source":v.get("source"),"packs":v.get("packs",[]),"image":f"cards/{setcode}/{n:03d}.png"})
        order={s["code"]:i for i,s in enumerate(sets)}
        cards.sort(key=lambda c:(order.get(c["set"],999),c["number"]))
        ids=[c["id"] for c in cards]
        if len(ids)!=len(set(ids)): raise ValueError("Duplicate card version IDs")
        OUT.parent.mkdir(parents=True,exist_ok=True)
        from datetime import datetime,timezone
        OUT.write_text(json.dumps({"schema_version":1,"source":UPSTREAM,"generated_at":datetime.now(timezone.utc).isoformat(),"sets":sets,"cards":cards},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
        print(f"Built {len(cards)} unique card versions across {len(sets)} sets.")
    finally: shutil.rmtree(tmp,ignore_errors=True)
if __name__=="__main__": main()
