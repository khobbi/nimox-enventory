DEVELOPER: HAYFORD EDOONU | Phone: +233553246379 | Email: edoonu@gmail.com

NIMOX ENTERPRISE - Inventory and Sales
Items AND sales are saved in db/items.json. Photos you upload through server.py go in images/.
server.py also keeps a daily copy of that file in db/backups/ (the last 60 days).

OPTION A - server.py (recommended; needed when more than one phone or computer is used)
  Needs Python 3 only (nothing else to install).
  Windows: double-click start-windows.bat      Linux/Mac: python3 server.py
  Open the address it prints. Phones on the same Wi-Fi can use the second address.
  Keep that window open while the shop uses the app.

OPTION B - no server (Chrome or Edge on ONE computer)
  Double-click index.html, press "Choose db/items.json", and pick the file in the db folder.
  Every change is then written straight into that file. Do not use two devices this way.

RECEIPTS
  Open js/db.js and fill in SHOP.phone and SHOP.address (first lines of the file)
  to print them on every receipt.

OWNER PIN, REPORTS AND CANCELLING SALES
  Press "Set PIN" at the top of any page to choose a 4 to 6 digit PIN. Staff can still sell, but the PIN is
  needed for: Reports (profit), adding/editing/deleting items, changing a price or giving a discount at checkout,
  cancelling a sale, and exporting/importing backups. Owner mode switches off by itself after 30 minutes.
  The PIN stops customers and staff. It is not bank-grade security: someone who can open the db folder on the
  computer can still read the data file.
  Forgot the PIN? Stop server.py, open db/items.json in Notepad, delete the whole "pin": { ... } part, save, start again.
