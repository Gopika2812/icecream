import re

file_path = r"C:\Users\HIG Ajay\ice_cream\saravanas_data\erp_00111062026093149.sql"
output_path = r"C:\Users\HIG Ajay\ice_cream\schema_results.txt"

tables_to_find = ['account_ledgers', 't_supplier', 't_supplier_contact']
current_table = None

print("Scanning for schemas...")

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    with open(output_path, 'w', encoding='utf-8') as out:
        for line in f:
            if line.startswith("CREATE TABLE `"):
                match = re.match(r"CREATE TABLE `([a-zA-Z0-9_]+)`", line)
                if match:
                    t = match.group(1)
                    if t in tables_to_find:
                        current_table = t
                        out.write(line)
            elif current_table:
                out.write(line)
                if line.strip().startswith(") ENGINE="):
                    out.write("\n\n")
                    tables_to_find.remove(current_table)
                    current_table = None
            
            if not tables_to_find and not current_table:
                break

print("Scan complete. Check schema_results.txt")
