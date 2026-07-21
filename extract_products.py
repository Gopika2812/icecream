import os
import json

sql_file = r"C:\Users\HIG Ajay\ice_cream\saravanas_data\erp_00111062026093149.sql"

items = []
materials = []

def extract_insert(line, table_name, target_list):
    # Very basic parsing, assuming INSERT INTO `table_name` VALUES (...);
    # Just extracting the first few string values as a guess for the name.
    # A more robust way is to find the INSERT and grab some strings.
    if f"INSERT INTO `{table_name}`" in line:
        # line format: INSERT INTO `table_name` VALUES (1,'ItemName',...);
        try:
            values_part = line.split("VALUES ")[1].strip()
            # Split by '),(' to get individual rows
            rows = values_part.split("),(")
            for row in rows:
                row = row.strip("();")
                cols = row.split(",")
                # Let's just grab string columns (they start with ')
                strings = [c.strip("'") for c in cols if c.startswith("'") and c.endswith("'")]
                if strings:
                    # The name is usually the first or second string
                    target_list.append(strings[0])
        except Exception as e:
            pass

print("Extracting items from t_item and t_material...")

with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if line.startswith("INSERT INTO `t_item`"):
            extract_insert(line, 't_item', items)
        elif line.startswith("INSERT INTO `t_material`"):
            extract_insert(line, 't_material', materials)

with open(r"C:\Users\HIG Ajay\ice_cream\products_list.json", 'w') as f:
    json.dump({"finished_goods_t_item": items[:100], "raw_materials_t_material": materials[:100]}, f, indent=4)

print(f"Extracted {len(items)} items and {len(materials)} materials (saved first 100 to products_list.json).")
