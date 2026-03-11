import os
from flask import Flask, request, jsonify
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)
BASE_URL = '/api/v1'

# ==========================================
# Configuración de Base de Datos
# ==========================================
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'sistema_agricola')
        )
        return connection
    except Error as e:
        print(f"Error conectando a MySQL: {e}")
        return None

# ==========================================
# Respuestas de Error Estándar
# ==========================================
def error_response(code, message):
    return jsonify({"code": str(code), "message": message}), code

# ==========================================
# Controladores Genéricos (CRUD)
# ==========================================
def handle_get_all(table):
    conn = get_db_connection()
    if not conn: return error_response(500, "Error de conexión a la base de datos")
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"SELECT * FROM {table}")
        records = cursor.fetchall()
        return jsonify(records), 200
    except Error as e:
        return error_response(500, str(e))
    finally:
        if conn.is_connected():
            cursor.close()
            conn.close()

def handle_get_one(table, pk_col, pk_val):
    conn = get_db_connection()
    if not conn: return error_response(500, "Error de conexión")
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"SELECT * FROM {table} WHERE {pk_col} = %s", (pk_val,))
        record = cursor.fetchone()
        if not record:
            return error_response(404, "Recurso no encontrado")
        return jsonify(record), 200
    except Error as e:
        return error_response(500, str(e))
    finally:
        if conn.is_connected(): cursor.close(); conn.close()

def handle_create(table, required_fields, data, pk_col=None):
    if not data: return error_response(400, "Cuerpo de solicitud vacío")
    
    for field in required_fields:
        if field not in data:
            return error_response(400, f"Falta el campo requerido: {field}")

    conn = get_db_connection()
    if not conn: return error_response(500, "Error de conexión")
    
    columns = ', '.join(data.keys())
    placeholders = ', '.join(['%s'] * len(data))
    values = tuple(data.values())
    
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"INSERT INTO {table} ({columns}) VALUES ({placeholders})", values)
        conn.commit()
        
        # Recuperar el registro creado
        last_id = cursor.lastrowid
        if last_id and pk_col:
            cursor.execute(f"SELECT * FROM {table} WHERE {pk_col} = %s", (last_id,))
            created_record = cursor.fetchone()
            return jsonify(created_record), 201
        
        # Si es tabla intermedia (ej. usuarios_predios) no suele retornar lastrowid útil
        return jsonify(data), 201
    except Error as e:
        return error_response(500, str(e))
    finally:
        if conn.is_connected(): cursor.close(); conn.close()

def handle_update(table, pk_col, pk_val, data):
    if not data: return error_response(400, "Cuerpo de solicitud vacío")
    
    conn = get_db_connection()
    if not conn: return error_response(500, "Error de conexión")
    
    set_clause = ', '.join([f"{key} = %s" for key in data.keys()])
    values = tuple(data.values()) + (pk_val,)
    
    try:
        cursor = conn.cursor(dictionary=True)
        # Verificar existencia
        cursor.execute(f"SELECT * FROM {table} WHERE {pk_col} = %s", (pk_val,))
        if not cursor.fetchone():
            return error_response(404, "Recurso no encontrado")
        
        # Actualizar
        cursor.execute(f"UPDATE {table} SET {set_clause} WHERE {pk_col} = %s", values)
        conn.commit()
        
        # Retornar actualizado
        cursor.execute(f"SELECT * FROM {table} WHERE {pk_col} = %s", (pk_val,))
        updated_record = cursor.fetchone()
        return jsonify(updated_record), 200
    except Error as e:
        return error_response(500, str(e))
    finally:
        if conn.is_connected(): cursor.close(); conn.close()

def handle_delete(table, pk_col, pk_val):
    conn = get_db_connection()
    if not conn: return error_response(500, "Error de conexión")
    
    try:
        cursor = conn.cursor()
        # Verificar existencia
        cursor.execute(f"SELECT 1 FROM {table} WHERE {pk_col} = %s", (pk_val,))
        if (!cursor.fetchone()):
            return error_response(404, "Recurso no encontrado")
            
        cursor.execute(f"DELETE FROM {table} WHERE {pk_col} = %s", (pk_val,))
        conn.commit()
        return '', 204
    except Error as e:
        return error_response(500, str(e))
    finally:
        if conn.is_connected(): cursor.close(); conn.close()

# Controladores especiales para IDs compuestos (Usuario_predio)
def handle_get_one_composite(table, col1, val1, col2, val2):
    conn = get_db_connection()
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"SELECT * FROM {table} WHERE {col1}=%s AND {col2}=%s", (val1, val2))
        record = cursor.fetchone()
        if not record: return error_response(404, "Recurso no encontrado")
        return jsonify(record), 200
    except Error as e: return error_response(500, str(e))
    finally: conn.close()

def handle_update_composite(table, col1, val1, col2, val2, data):
    conn = get_db_connection()
    set_clause = ', '.join([f"{key} = %s" for key in data.keys()])
    values = tuple(data.values()) + (val1, val2)
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(f"SELECT 1 FROM {table} WHERE {col1}=%s AND {col2}=%s", (val1, val2))
        if not cursor.fetchone(): return error_response(404, "Recurso no encontrado")
        
        cursor.execute(f"UPDATE {table} SET {set_clause} WHERE {col1}=%s AND {col2}=%s", values)
        conn.commit()
        return jsonify(data), 200 # Simplificado por brevedad
    except Error as e: return error_response(500, str(e))
    finally: conn.close()

def handle_delete_composite(table, col1, val1, col2, val2):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(f"SELECT 1 FROM {table} WHERE {col1}=%s AND {col2}=%s", (val1, val2))
        if not cursor.fetchone(): return error_response(404, "Recurso no encontrado")
        
        cursor.execute(f"DELETE FROM {table} WHERE {col1}=%s AND {col2}=%s", (val1, val2))
        conn.commit()
        return '', 204
    except Error as e: return error_response(500, str(e))
    finally: conn.close()

# ==========================================
# RUTAS DE LA API
# ==========================================

# --- Usuarios ---
@app.route(f'{BASE_URL}/usuarios', methods=['GET'])
def get_usuarios(): return handle_get_all('Usuario')
@app.route(f'{BASE_URL}/usuarios', methods=['POST'])
def create_usuario(): return handle_create('Usuario', ['Nombre', 'Email', 'Contraseña'], request.json, 'IDusuario')
@app.route(f'{BASE_URL}/usuarios/<int:id>', methods=['GET'])
def get_usuario(id): return handle_get_one('Usuario', 'IDusuario', id)
@app.route(f'{BASE_URL}/usuarios/<int:id>', methods=['PUT'])
def update_usuario(id): return handle_update('Usuario', 'IDusuario', id, request.json)
@app.route(f'{BASE_URL}/usuarios/<int:id>', methods=['DELETE'])
def delete_usuario(id): return handle_delete('Usuario', 'IDusuario', id)

# --- Predios ---
@app.route(f'{BASE_URL}/predios', methods=['GET'])
def get_predios(): return handle_get_all('Predio')
@app.route(f'{BASE_URL}/predios', methods=['POST'])
def create_predio(): return handle_create('Predio', ['NombrePredio'], request.json, 'IDpredio')
@app.route(f'{BASE_URL}/predios/<int:id>', methods=['GET'])
def get_predio(id): return handle_get_one('Predio', 'IDpredio', id)
@app.route(f'{BASE_URL}/predios/<int:id>', methods=['PUT'])
def update_predio(id): return handle_update('Predio', 'IDpredio', id, request.json)
@app.route(f'{BASE_URL}/predios/<int:id>', methods=['DELETE'])
def delete_predio(id): return handle_delete('Predio', 'IDpredio', id)

# --- Usuarios-Predios (Composite ID: IDusuario-IDpredio) ---
@app.route(f'{BASE_URL}/usuarios-predios', methods=['GET'])
def get_usuarios_predios(): return handle_get_all('Usuario_predio')
@app.route(f'{BASE_URL}/usuarios-predios', methods=['POST'])
def create_usuario_predio(): return handle_create('Usuario_predio', ['Rol'], request.json)
@app.route(f'{BASE_URL}/usuarios-predios/<string:id>', methods=['GET'])
def get_usuario_predio(id):
    try: id_u, id_p = id.split('-')
    except ValueError: return error_response(400, "Formato de ID inválido. Use IDusuario-IDpredio")
    return handle_get_one_composite('Usuario_predio', 'IDusuario', id_u, 'IDpredio', id_p)
@app.route(f'{BASE_URL}/usuarios-predios/<string:id>', methods=['PUT'])
def update_usuario_predio(id):
    try: id_u, id_p = id.split('-')
    except ValueError: return error_response(400, "Formato inválido")
    return handle_update_composite('Usuario_predio', 'IDusuario', id_u, 'IDpredio', id_p, request.json)
@app.route(f'{BASE_URL}/usuarios-predios/<string:id>', methods=['DELETE'])
def delete_usuario_predio(id):
    try: id_u, id_p = id.split('-')
    except ValueError: return error_response(400, "Formato inválido")
    return handle_delete_composite('Usuario_predio', 'IDusuario', id_u, 'IDpredio', id_p)

# --- Registros Auditoría ---
@app.route(f'{BASE_URL}/registros-auditoria', methods=['GET'])
def get_auditoria(): return handle_get_all('RegistroAuditoria')
@app.route(f'{BASE_URL}/registros-auditoria', methods=['POST'])
def create_auditoria(): return handle_create('RegistroAuditoria', [], request.json, 'IDregistro')
@app.route(f'{BASE_URL}/registros-auditoria/<int:id>', methods=['GET'])
def get_auditoria_id(id): return handle_get_one('RegistroAuditoria', 'IDregistro', id)
@app.route(f'{BASE_URL}/registros-auditoria/<int:id>', methods=['PUT'])
def update_auditoria(id): return handle_update('RegistroAuditoria', 'IDregistro', id, request.json)
@app.route(f'{BASE_URL}/registros-auditoria/<int:id>', methods=['DELETE'])
def delete_auditoria(id): return handle_delete('RegistroAuditoria', 'IDregistro', id)

# --- Módulos Control ---
@app.route(f'{BASE_URL}/modulos-control', methods=['GET'])
def get_modulos(): return handle_get_all('ModuloControl')
@app.route(f'{BASE_URL}/modulos-control', methods=['POST'])
def create_modulo(): return handle_create('ModuloControl', [], request.json, 'ID_Modulo')
@app.route(f'{BASE_URL}/modulos-control/<int:id>', methods=['GET'])
def get_modulo(id): return handle_get_one('ModuloControl', 'ID_Modulo', id)
@app.route(f'{BASE_URL}/modulos-control/<int:id>', methods=['PUT'])
def update_modulo(id): return handle_update('ModuloControl', 'ID_Modulo', id, request.json)
@app.route(f'{BASE_URL}/modulos-control/<int:id>', methods=['DELETE'])
def delete_modulo(id): return handle_delete('ModuloControl', 'ID_Modulo', id)

# --- Áreas Riego ---
@app.route(f'{BASE_URL}/areas-riego', methods=['GET'])
def get_areas(): return handle_get_all('AreaRiego')
@app.route(f'{BASE_URL}/areas-riego', methods=['POST'])
def create_area(): return handle_create('AreaRiego', [], request.json, 'ID_Area')
@app.route(f'{BASE_URL}/areas-riego/<int:id>', methods=['GET'])
def get_area(id): return handle_get_one('AreaRiego', 'ID_Area', id)
@app.route(f'{BASE_URL}/areas-riego/<int:id>', methods=['PUT'])
def update_area(id): return handle_update('AreaRiego', 'ID_Area', id, request.json)
@app.route(f'{BASE_URL}/areas-riego/<int:id>', methods=['DELETE'])
def delete_area(id): return handle_delete('AreaRiego', 'ID_Area', id)

# --- Sensores ---
@app.route(f'{BASE_URL}/sensores', methods=['GET'])
def get_sensores(): return handle_get_all('Sensor')
@app.route(f'{BASE_URL}/sensores', methods=['POST'])
def create_sensor(): return handle_create('Sensor', [], request.json, 'IDsensor')
@app.route(f'{BASE_URL}/sensores/<int:id>', methods=['GET'])
def get_sensor(id): return handle_get_one('Sensor', 'IDsensor', id)
@app.route(f'{BASE_URL}/sensores/<int:id>', methods=['PUT'])
def update_sensor(id): return handle_update('Sensor', 'IDsensor', id, request.json)
@app.route(f'{BASE_URL}/sensores/<int:id>', methods=['DELETE'])
def delete_sensor(id): return handle_delete('Sensor', 'IDsensor', id)

# --- Configuraciones Cultivos ---
@app.route(f'{BASE_URL}/configuraciones-cultivos', methods=['GET'])
def get_configs(): return handle_get_all('ConfiguracionCultivo')
@app.route(f'{BASE_URL}/configuraciones-cultivos', methods=['POST'])
def create_config(): return handle_create('ConfiguracionCultivo', [], request.json, 'ID_Configuracion')
@app.route(f'{BASE_URL}/configuraciones-cultivos/<int:id>', methods=['GET'])
def get_config(id): return handle_get_one('ConfiguracionCultivo', 'ID_Configuracion', id)
@app.route(f'{BASE_URL}/configuraciones-cultivos/<int:id>', methods=['PUT'])
def update_config(id): return handle_update('ConfiguracionCultivo', 'ID_Configuracion', id, request.json)
@app.route(f'{BASE_URL}/configuraciones-cultivos/<int:id>', methods=['DELETE'])
def delete_config(id): return handle_delete('ConfiguracionCultivo', 'ID_Configuracion', id)

# --- Alertas ---
@app.route(f'{BASE_URL}/alertas', methods=['GET'])
def get_alertas(): return handle_get_all('Alerta')
@app.route(f'{BASE_URL}/alertas', methods=['POST'])
def create_alerta(): return handle_create('Alerta', [], request.json, 'ID_Alerta')
@app.route(f'{BASE_URL}/alertas/<int:id>', methods=['GET'])
def get_alerta(id): return handle_get_one('Alerta', 'ID_Alerta', id)
@app.route(f'{BASE_URL}/alertas/<int:id>', methods=['PUT'])
def update_alerta(id): return handle_update('Alerta', 'ID_Alerta', id, request.json)
@app.route(f'{BASE_URL}/alertas/<int:id>', methods=['DELETE'])
def delete_alerta(id): return handle_delete('Alerta', 'ID_Alerta', id)

# --- Mediciones Históricas ---
@app.route(f'{BASE_URL}/mediciones-historicas', methods=['GET'])
def get_mediciones(): return handle_get_all('MedicionHistorica')
@app.route(f'{BASE_URL}/mediciones-historicas', methods=['POST'])
def create_medicion(): return handle_create('MedicionHistorica', [], request.json, 'ID_Medicion')
@app.route(f'{BASE_URL}/mediciones-historicas/<int:id>', methods=['GET'])
def get_medicion(id): return handle_get_one('MedicionHistorica', 'ID_Medicion', id)
@app.route(f'{BASE_URL}/mediciones-historicas/<int:id>', methods=['PUT'])
def update_medicion(id): return handle_update('MedicionHistorica', 'ID_Medicion', id, request.json)
@app.route(f'{BASE_URL}/mediciones-historicas/<int:id>', methods=['DELETE'])
def delete_medicion(id): return handle_delete('MedicionHistorica', 'ID_Medicion', id)

if __name__ == '__main__':
    # Ejecuta el servidor en el puerto 3000 como indica el YAML
    app.run(host='0.0.0.0', port=3000, debug=True)
