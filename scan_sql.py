import re

file_path = r"C:\Users\HIG Ajay\ice_cream\saravanas_data\erp_00111062026093149.sql"
output_path = r"C:\Users\HIG Ajay\ice_cream\results.txt"

print("Scanning for account_ledgers vendors...")

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    with open(output_path, 'w', encoding='utf-8') as out:
        for line in f:
            if line.startswith("INSERT INTO `account_ledgers`"):
                # Extract all string values that might be names (the second parameter in the tuple)
                # Tuples look like (id,'Name',...)
                matches = re.findall(r"\(\d+,'([^']+)'", line)
                count = 0
                for match in matches:
                    # Filter for business-like names
                    if any(word in match.upper() for word in ['ENTERPRISE', 'AGENCY', 'TRADER', 'DAIRY', 'FARM', 'COMPANY', 'INDUSTRIES', 'PACKAGING']):
                        out.write(match + "\n")
                        count += 1
                        if count >= 20:
                            break
                break

print("Scan complete. Check results.txt")
