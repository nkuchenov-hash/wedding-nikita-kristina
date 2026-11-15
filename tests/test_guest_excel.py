from __future__ import annotations
import csv
import importlib.util
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from openpyxl import Workbook

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location("wedding_excel",ROOT/"tools"/"prepare-guest-import.py")
assert SPEC and SPEC.loader
MODULE=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)

class GuestImportTest(unittest.TestCase):
    def test_unconfirmed_multisheet_import_with_ambiguity_report(self):
        with TemporaryDirectory() as folder:
            base=Path(folder)
            wb=Workbook();a=wb.active;a.title="Никита"
            a.append(["ФИО","Сторона","+1","Дети","Email"])
            a.append(["Рома и Алина с детьми","жених","да","2","family@example.test"])
            a.append(["Рома и Алина с детьми","жених","да","2","family@example.test"])
            b=wb.create_sheet("Кристина")
            b.append(["Уточнение",None,None])
            b.append(["Гость","Сторона","Email"])
            b.append(["Татьяна","невеста","tan@example.test"])
            src=base/"guest-list.xlsx";out=base/"guest-list.csv";wb.save(src)
            summary=MODULE.convert(src,out)
            self.assertTrue(summary["unconfirmed"])
            self.assertEqual(summary["importable"],3)
            self.assertEqual(summary["duplicate_candidates"],1)
            self.assertGreaterEqual(summary["review_required"],2)
            with out.open(encoding="utf-8-sig",newline="") as f:
                rows=list(csv.DictReader(f))
            self.assertEqual(rows[0]["side"],"groom")
            self.assertEqual(rows[0]["children_count"],"2")
            self.assertEqual(rows[0]["plus_one_allowed"],"1")
            self.assertEqual(rows[2]["side"],"bride")
            self.assertEqual(rows[2]["display_name"],"Татьяна")
            audit=json.loads(out.with_suffix(".audit.json").read_text(encoding="utf-8"))
            self.assertTrue(any("POSSIBLE_GROUP_NOT_SPLIT" in str(x.get("reason")) for x in audit["review"]))
            self.assertTrue(any("POSSIBLE_DUPLICATE" in str(x.get("reason")) for x in audit["review"]))
    def test_unrecognized_workbook_not_imported(self):
        with TemporaryDirectory() as folder:
            p=Path(folder)/"empty.xlsx";w=Workbook();w.active.append(["Date","Notes"]);w.save(p)
            with self.assertRaises(ValueError):
                MODULE.convert(p,p.with_suffix(".csv"))

if __name__=="__main__":
    unittest.main()
