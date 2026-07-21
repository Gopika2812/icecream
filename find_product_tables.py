import os

sql_file = r"C:\Users\HIG Ajay\ice_cream\saravanas_data\erp_00111062026093149.sql"

if not os.path.exists(sql_file):
    print("SQL file not found!")
    exit(1)

print("Scanning for tables related to products/items...")

found_tables = []
with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if line.startswith('CREATE TABLE'):
            table_name = line.split('`')[1] if '`' in line else line.split()[2]
            name_lower = table_name.lower()
            if 'product' in name_lower or 'item' in name_lower or 'material' in name_lower or 'goods' in name_lower or 'stock' in name_lower:
                found_tables.append(table_name)
                print(f"Found table: {table_name}")
        
        # Stop after we've seen a bunch, or just read the whole thing
        # (It's large but reading line by line should be fast enough)

print("Finished scanning!")
