import re
import json

file_path = r"C:\Users\HIG Ajay\ice_cream\saravanas_data\erp_00111062026093149.sql"
output_path = r"C:\Users\HIG Ajay\ice_cream\vendors.json"

print("Extracting vendors...")

vendors = []

# Regex to match the tuple values: (Ledger_No, 'Ledger_Name', 'PrintName', 'TrimName', 'Alias', SGroup_No, ...)
# Since the line has thousands of tuples like (1,'55 Cash A/c',...,1,0,0),(2,'Sales a/c',...
# We can use a regex that matches each tuple.
# But regex on a 1GB string is slow. 
# We'll read the line, then split by `),(` and process each chunk.

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        if line.startswith("INSERT INTO `account_ledgers` VALUES "):
            # Remove the prefix and the trailing `;\n`
            data = line[len("INSERT INTO `account_ledgers` VALUES "):].strip()
            if data.endswith(";"):
                data = data[:-1]
            
            # The data string is `(1,'name',...),(2,'name',...)`
            # We strip the first `(` and last `)`
            if data.startswith("("):
                data = data[1:]
            if data.endswith(")"):
                data = data[:-1]
            
            # Split by `),(`
            # Note: This is fragile if string fields contain `),(` but it's okay for a quick extraction
            chunks = data.split("),(")
            for chunk in chunks:
                # Poor man's CSV split that respects quotes
                fields = []
                current_field = []
                in_quotes = False
                escape_next = False
                for char in chunk:
                    if escape_next:
                        current_field.append(char)
                        escape_next = False
                    elif char == '\\':
                        escape_next = True
                    elif char == "'":
                        in_quotes = not in_quotes
                    elif char == ',' and not in_quotes:
                        fields.append("".join(current_field))
                        current_field = []
                    else:
                        current_field.append(char)
                fields.append("".join(current_field))
                
                # Check SGroup_No (index 5) == 13
                if len(fields) > 6 and fields[5].strip() == '13':
                    # It's a vendor!
                    # Let's map the fields
                    # Ledger_Name (index 1)
                    # Add1 (index 12)
                    # Add2 (index 13)
                    # Add3 (index 14)
                    # Add4 (index 15) -> City?
                    # Add5 (index 16)
                    # Phone (index 17)
                    # Mobile (index 18)
                    # Email (index 19)
                    # gstin (index 27)
                    # state_name (index 55)
                    # state_code (index 56)
                    
                    try:
                        name = fields[1].strip()
                        street = (fields[12].strip() + " " + fields[13].strip()).strip()
                        city = fields[15].strip()
                        if not city: city = fields[14].strip() # fallback
                        phone = fields[18].strip()
                        if not phone: phone = fields[17].strip()
                        email = fields[19].strip()
                        gstin = fields[27].strip()
                        state = fields[55].strip()
                        stateCode = fields[56].strip()
                        
                        vendor = {
                            "vendorCode": f"VEN-00{len(vendors)+1}",
                            "companyName": name,
                            "contactPerson": name, # default
                            "phone": phone,
                            "email": email,
                            "gstinNumber": gstin,
                            "billingAddress": {
                                "street": street,
                                "city": city,
                                "state": state,
                                "stateCode": stateCode,
                                "pinCode": "000000" # Placeholder
                            }
                        }
                        vendors.append(vendor)
                    except Exception as e:
                        pass
            break

with open(output_path, 'w', encoding='utf-8') as out:
    json.dump(vendors, out, indent=4)

print(f"Extracted {len(vendors)} vendors. Saved to vendors.json")
