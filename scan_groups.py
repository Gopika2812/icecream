import re

file_path = r"C:\Users\HIG Ajay\ice_cream\saravanas_data\erp_00111062026093149.sql"
output_path = r"C:\Users\HIG Ajay\ice_cream\groups_results.txt"

tables_to_find = ['account_groups']

print("Scanning for account_groups INSERTS...")

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    with open(output_path, 'w', encoding='utf-8') as out:
        for line in f:
            if line.startswith("INSERT INTO `account_groups`"):
                out.write(line[:2000] + "\n\n")
                break

print("Scan complete. Check groups_results.txt")
