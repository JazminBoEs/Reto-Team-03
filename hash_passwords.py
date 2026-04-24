"""
Script auxiliar para generar hashes de contraseñas compatibles con werkzeug.
Ejecutar con:  python hash_passwords.py
Los hashes generados se pueden copiar directamente en IrriGo.sql
"""
from werkzeug.security import generate_password_hash

passwords = {
    "admin@irrigo.com": "Admin.123!",
    "jazmin@example.com": "Jazmin.123!",
}

print("=" * 70)
print("  Hashes de contraseñas para IrriGo (werkzeug)")
print("=" * 70)
for email, plain in passwords.items():
    hashed = generate_password_hash(plain)
    print(f"\n  Usuario: {email}")
    print(f"  Plain:   {plain}")
    print(f"  Hash:    {hashed}")

print("\n" + "=" * 70)
print("  Copia estos hashes en las sentencias INSERT de IrriGo.sql")
print("=" * 70)
