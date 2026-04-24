import os
import re
import string
import secrets
from datetime import datetime, date, timedelta
from decimal import Decimal
from functools import wraps
import random
import threading
import time
import logging
from flask import Flask, request, jsonify, g
from flask_cors import CORS
import mysql.connector
from werkzeug.security import generate_password_hash, check_password_hash
from flask.json.provider import DefaultJSONProvider
try:
    import jwt as pyjwt  # type: ignore  # pip install pyjwt  (pyjwt 2.x instala el módulo 'jwt')
    _JWT_AVAILABLE = True
except ImportError:
    _JWT_AVAILABLE = False
    logging.warning("PyJWT no instalado. Ejecuta: pip install pyjwt")

# -------------------------------------------------------------------
# Configuración y JSON Provider Personalizado
# -------------------------------------------------------------------
class CustomJSONProvider(DefaultJSONProvider):
    """
    Serializador JSON personalizado para manejar tipos de datos
    de MySQL no compatibles por defecto en Flask.
    """
    def default(self, o):
        if isinstance(o, datetime):
            return o.isoformat() + "Z"
        if isinstance(o, date):
            return o.isoformat()
        if isinstance(o, Decimal):
            return float(o)
        return super().default(o)

app = Flask(__name__)
CORS(app)
app.json = CustomJSONProvider(app)

# -------------------------------------------------------------------
# JWT y Seguridad
# -------------------------------------------------------------------
JWT_SECRET = os.environ.get('JWT_SECRET_KEY', 'irrigo-dev-secret-change-in-prod')
PASSWORD_REGEX = re.compile(
    r'^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]).{8,}$'
)

def validar_contrasena(password):
    """Retorna (is_valid: bool, error_msg: str|None)"""
    if not PASSWORD_REGEX.match(password):
        return False, "La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo"
    return True, None

def generar_codigo_acceso():
    """Genera un código alfanumérico único de 8 caracteres (e.g. AB12CD34)"""
    chars = string.ascii_uppercase + string.digits
    for _ in range(20):  # máximo 20 intentos
        codigo = ''.join(secrets.choice(chars) for _ in range(8))
        existing = execute_query(
            "SELECT 1 FROM Predio WHERE CodigoAcceso = %s",
            (codigo,), fetch=True, fetchone=True
        )
        if not existing:
            return codigo
    raise RuntimeError("No se pudo generar un código único")

def generar_token(user_id, email, roles):
    """Genera JWT de sesión con expiración de 24 horas"""
    if not _JWT_AVAILABLE:
        return None
    payload = {
        "sub": user_id,
        "email": email,
        "roles": roles,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm="HS256")

def jwt_required(f):
    """Decorador que valida JWT y adjunta payload a g.usuario_actual"""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not _JWT_AVAILABLE:
            return jsonify({"code": 500, "message": "JWT no disponible, instala pyjwt"}), 500
        auth = request.headers.get('Authorization', '')
        token = auth.replace('Bearer ', '').strip()
        if not token:
            return jsonify({"code": 401, "message": "Token de autenticación requerido"}), 401
        try:
            payload = pyjwt.decode(token, JWT_SECRET, algorithms=["HS256"])
            g.usuario_actual = payload
        except pyjwt.ExpiredSignatureError:
            return jsonify({"code": 401, "message": "Token expirado, inicia sesión de nuevo"}), 401
        except pyjwt.InvalidTokenError:
            return jsonify({"code": 401, "message": "Token inválido"}), 401
        return f(*args, **kwargs)
    return decorated

# -------------------------------------------------------------------
# Función Helper de Base de Datos
# -------------------------------------------------------------------
def execute_query(query, params=None, fetch=False, fetchone=False, commit=False):
    """
    Ejecuta una consulta SQL en la base de datos MySQL de forma segura,
    manejando cursores y conexiones en bloques try-finally.
    """
    conn = None
    cursor = None
    try:
        conn = mysql.connector.connect(
            host=os.environ.get('DB_HOST', 'localhost'),
            user=os.environ.get('DB_USER', 'root'),
            password=os.environ.get('DB_PASSWORD', ''),
            database=os.environ.get('DB_NAME', 'IrriGo'),
            port=os.environ.get('DB_PORT', '3306')
        )
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())

        if commit:
            conn.commit()

        if fetch:
            if fetchone:
                return cursor.fetchone()
            return cursor.fetchall()

        return cursor.lastrowid if commit else None

    except mysql.connector.Error as e:
        if conn and commit:
            conn.rollback()
        raise e
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# -------------------------------------------------------------------
# Funciones Helper Constructores de Queries Dinámicos
# -------------------------------------------------------------------
def build_insert_query(table_name, data):
    columns = ', '.join(data.keys())
    placeholders = ', '.join(['%s'] * len(data))
    query = f"INSERT INTO {table_name} ({columns}) VALUES ({placeholders})"
    return query, tuple(data.values())

def build_update_query(table_name, data, pk_name, pk_value):
    if not data:
        return None, None
    set_clauses = [f"{key} = %s" for key in data.keys()]
    query = f"UPDATE {table_name} SET {', '.join(set_clauses)} WHERE {pk_name} = %s"
    params = list(data.values())
    params.append(pk_value)
    return query, tuple(params)

def build_update_query_composite(table_name, data, pks):
    if not data:
        return None, None
    set_clauses = [f"{key} = %s" for key in data.keys()]
    where_clauses = [f"{k} = %s" for k in pks.keys()]
    query = f"UPDATE {table_name} SET {', '.join(set_clauses)} WHERE {' AND '.join(where_clauses)}"
    params = list(data.values())
    params.extend(pks.values())
    return query, tuple(params)

def get_paginated_and_filtered(table_name, filter_map=None):
    query = f"SELECT * FROM {table_name} WHERE 1=1"
    params = []
    
    if filter_map:
        for query_param, db_column in filter_map.items():
            if query_param in request.args:
                query += f" AND {db_column} = %s"
                params.append(request.args.get(query_param))

    limit = int(request.args.get('limit', 20))
    offset = int(request.args.get('offset', 0))

    query += " LIMIT %s OFFSET %s"
    params.extend([limit, offset])

    return execute_query(query, tuple(params), fetch=True)

# -------------------------------------------------------------------
# Manejo Global de Errores
# -------------------------------------------------------------------
@app.errorhandler(404)
def not_found(e):
    return jsonify({"code": 404, "message": "No encontrado"}), 404

@app.errorhandler(Exception)
def handle_exception(e):
    if isinstance(e, mysql.connector.Error):
        return jsonify({"code": 500, "message": f"Error de base de datos: {str(e)}"}), 500
    return jsonify({"code": 500, "message": f"Error interno: {str(e)}"}), 500

# ===================================================================
# ENDPOINTS REST API (Prefix: /api/v1)
# ===================================================================

# ----------------- TAG: Auth (Login + Registro) -----------------

@app.route('/api/v1/usuarios/login', methods=['POST'])
def login_usuario():
    data = request.json
    if not data or 'Email' not in data or 'Contrasena' not in data:
        return jsonify({"code": 400, "message": "Email y Contrasena son requeridos"}), 400

    user = execute_query("SELECT * FROM Usuario WHERE Email = %s", (data['Email'],), fetch=True, fetchone=True)

    if user and check_password_hash(user['Contrasena'], data['Contrasena']):
        del user['Contrasena']
        # Consultar rol en predio(s)
        roles_db = execute_query(
            """
            SELECT up.IDpredio, up.Admin, up.Rol, up.Alcance, up.Area_Permitida,
                   p.NombrePredio, p.CodigoAcceso
            FROM Usuario_predio up
            JOIN Predio p ON p.IDpredio = up.IDpredio
            WHERE up.IDusuario = %s AND up.Activo = TRUE
            """,
            (user['IDusuario'],), fetch=True
        ) or []
        roles_payload = [
            {"predio": r['IDpredio'], "rol": r['Rol'], "alcance": r['Alcance'],
             "area": r['Area_Permitida'], "nombrePredio": r['NombrePredio'],
             "codigoAcceso": r['CodigoAcceso']}
            for r in roles_db
        ]
        user['predios'] = roles_payload
        user['esAdmin'] = any(r['Rol'] == 'admin' for r in roles_db)
        # Primer predio del usuario
        user['predioActual'] = roles_db[0]['IDpredio'] if roles_db else None
        user['areaPermitida'] = roles_db[0]['Area_Permitida'] if roles_db else None
        user['alcance'] = roles_db[0]['Alcance'] if roles_db else 'todo'
        # Generar JWT
        token = generar_token(user['IDusuario'], data['Email'], roles_payload)
        return jsonify({"token": token, "usuario": user}), 200

    return jsonify({"code": 401, "message": "No autorizado, credenciales inválidas"}), 401


@app.route('/api/v1/registro', methods=['POST'])
def registro_con_rol():
    """
    Registro diferenciado por rol.
    Admin: crea usuario + predio (genera CodigoAcceso automático).
    Lector: crea usuario + se vincula al predio via CodigoAcceso.
    """
    data = request.json or {}
    tipo = data.get('tipoUsuario', 'lector')

    # Validar campos requeridos
    for campo in ['Nombre', 'Email', 'Contrasena']:
        if not data.get(campo):
            return jsonify({"code": 400, "message": f"{campo} es requerido"}), 400

    # Validar contraseña
    ok, err = validar_contrasena(data['Contrasena'])
    if not ok:
        return jsonify({"code": 400, "message": err}), 400

    contrasena_hash = generate_password_hash(data['Contrasena'])
    user_data = {
        'Nombre': data['Nombre'],
        'Apellido': data.get('Apellido', ''),
        'Email': data['Email'],
        'Contrasena': contrasena_hash,
        'Telefono': data.get('Telefono', '')
    }

    if tipo == 'admin':
        predio_info = data.get('predio', {})
        if not predio_info.get('NombrePredio'):
            return jsonify({"code": 400, "message": "El nombre del predio es requerido para Admin"}), 400

        # Crear usuario
        q, p = build_insert_query('Usuario', user_data)
        user_id = execute_query(q, p, commit=True)

        # Crear predio con código autogenerado
        codigo = generar_codigo_acceso()
        predio_data = {
            'CodigoAcceso': codigo,
            'NombrePredio': predio_info['NombrePredio'],
            'Ubicacion': predio_info.get('Ubicacion', ''),
            'Latitud': predio_info.get('Latitud') or None,
            'Longitud': predio_info.get('Longitud') or None
        }
        q2, p2 = build_insert_query('Predio', predio_data)
        predio_id = execute_query(q2, p2, commit=True)

        # Vincular como admin
        q3, p3 = build_insert_query('Usuario_predio', {
            'IDusuario': user_id, 'IDpredio': predio_id,
            'Admin': True, 'Rol': 'admin', 'Alcance': 'todo'
        })
        execute_query(q3, p3, commit=True)

        return jsonify({
            "message": "Cuenta admin creada exitosamente",
            "codigoAcceso": codigo,
            "idUsuario": user_id,
            "idPredio": predio_id
        }), 201

    elif tipo == 'lector':
        codigo = data.get('codigoAcceso', '').strip().upper()
        if len(codigo) != 8:
            return jsonify({"code": 400, "message": "El código de acceso debe tener 8 caracteres"}), 400

        predio = execute_query(
            "SELECT IDpredio, NombrePredio FROM Predio WHERE CodigoAcceso = %s",
            (codigo,), fetch=True, fetchone=True
        )
        if not predio:
            return jsonify({"code": 404, "message": "Código de predio inválido. Verifica con tu administrador."}), 404

        # Crear usuario
        q, p = build_insert_query('Usuario', user_data)
        user_id = execute_query(q, p, commit=True)

        # Vincular como lector (alcance 'todo' por defecto; admin puede cambiar después)
        q2, p2 = build_insert_query('Usuario_predio', {
            'IDusuario': user_id, 'IDpredio': predio['IDpredio'],
            'Admin': False, 'Rol': 'lector', 'Alcance': 'todo'
        })
        execute_query(q2, p2, commit=True)

        return jsonify({
            "message": "Cuenta lector creada exitosamente",
            "idUsuario": user_id,
            "idPredio": predio['IDpredio'],
            "nombrePredio": predio['NombrePredio']
        }), 201

    return jsonify({"code": 400, "message": "tipoUsuario debe ser 'admin' o 'lector'"}), 400

# ----------------- TAG: Usuarios -----------------

@app.route('/api/v1/usuarios', methods=['GET'])
def get_usuarios():
    records = get_paginated_and_filtered('Usuario')
    # Omitimos la contraseña de las respuestas GET
    for r in records:
        r.pop('Contrasena', None)
    return jsonify(records), 200

@app.route('/api/v1/usuarios', methods=['POST'])
def crear_usuario():
    data = request.json
    if 'Contrasena' in data:
        data['Contrasena'] = generate_password_hash(data['Contrasena'])
        
    query, params = build_insert_query('Usuario', data)
    last_id = execute_query(query, params, commit=True)
    
    new_user = execute_query("SELECT * FROM Usuario WHERE IDusuario = %s", (last_id,), fetch=True, fetchone=True)
    if new_user:
        new_user.pop('Contrasena', None)
    return jsonify(new_user), 201

@app.route('/api/v1/usuarios/<int:idUsuario>', methods=['GET'])
def get_usuario_by_id(idUsuario):
    user = execute_query("SELECT * FROM Usuario WHERE IDusuario = %s", (idUsuario,), fetch=True, fetchone=True)
    if not user:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    user.pop('Contrasena', None)
    return jsonify(user), 200

@app.route('/api/v1/usuarios/<int:idUsuario>', methods=['PUT'])
def actualizar_usuario(idUsuario):
    data = request.json
    existing = execute_query("SELECT 1 FROM Usuario WHERE IDusuario = %s", (idUsuario,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404

    if 'Contrasena' in data:
        data['Contrasena'] = generate_password_hash(data['Contrasena'])

    query, params = build_update_query('Usuario', data, 'IDusuario', idUsuario)
    if query:
        execute_query(query, params, commit=True)

    updated_user = execute_query("SELECT * FROM Usuario WHERE IDusuario = %s", (idUsuario,), fetch=True, fetchone=True)
    updated_user.pop('Contrasena', None)
    return jsonify(updated_user), 200

@app.route('/api/v1/usuarios/<int:idUsuario>', methods=['DELETE'])
def eliminar_usuario(idUsuario):
    existing = execute_query("SELECT 1 FROM Usuario WHERE IDusuario = %s", (idUsuario,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
        
    execute_query("DELETE FROM Usuario WHERE IDusuario = %s", (idUsuario,), commit=True)
    return '', 204

# ----------------- TAG: Predios -----------------

@app.route('/api/v1/predios/validar-codigo/<codigo>', methods=['GET'])
def validar_codigo_predio(codigo):
    """Verifica si un CodigoAcceso existe. Usado por el frontend en tiempo real."""
    predio = execute_query(
        "SELECT NombrePredio, Ubicacion FROM Predio WHERE CodigoAcceso = %s",
        (codigo.upper().strip(),), fetch=True, fetchone=True
    )
    if predio:
        return jsonify({"valido": True, "predio": predio}), 200
    return jsonify({"valido": False}), 200

@app.route('/api/v1/predios/<int:idPredio>/regenerar-codigo', methods=['POST'])
@jwt_required
def regenerar_codigo_predio(idPredio):
    """Solo el admin del predio puede regenerar el código. Los lectores existentes no pierden acceso."""
    user_id = g.usuario_actual.get('sub')
    rol = execute_query(
        "SELECT Rol FROM Usuario_predio WHERE IDusuario = %s AND IDpredio = %s AND Activo = TRUE",
        (user_id, idPredio), fetch=True, fetchone=True
    )
    if not rol or rol['Rol'] != 'admin':
        return jsonify({"code": 403, "message": "Solo el administrador del predio puede regenerar el código"}), 403

    nuevo_codigo = generar_codigo_acceso()
    execute_query(
        "UPDATE Predio SET CodigoAcceso = %s WHERE IDpredio = %s",
        (nuevo_codigo, idPredio), commit=True
    )
    return jsonify({"codigoAcceso": nuevo_codigo, "message": "Código regenerado. Los lectores actuales mantienen su acceso."}), 200

@app.route('/api/v1/predios', methods=['GET'])
def get_predios():
    records = get_paginated_and_filtered('Predio')
    return jsonify(records), 200

@app.route('/api/v1/predios', methods=['POST'])
def crear_predio():
    data = request.json
    if 'CodigoAcceso' not in data:
        data['CodigoAcceso'] = generar_codigo_acceso()
    query, params = build_insert_query('Predio', data)
    last_id = execute_query(query, params, commit=True)
    new_record = execute_query("SELECT * FROM Predio WHERE IDpredio = %s", (last_id,), fetch=True, fetchone=True)
    return jsonify(new_record), 201

@app.route('/api/v1/predios/<int:idPredio>', methods=['GET'])
def get_predio_by_id(idPredio):
    record = execute_query("SELECT * FROM Predio WHERE IDpredio = %s", (idPredio,), fetch=True, fetchone=True)
    if not record:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    return jsonify(record), 200

@app.route('/api/v1/predios/<int:idPredio>', methods=['PUT'])
def actualizar_predio(idPredio):
    data = request.json
    existing = execute_query("SELECT 1 FROM Predio WHERE IDpredio = %s", (idPredio,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    # Nunca permitir modificar CodigoAcceso directamente por esta ruta
    data.pop('CodigoAcceso', None)
    query, params = build_update_query('Predio', data, 'IDpredio', idPredio)
    if query:
        execute_query(query, params, commit=True)
    updated_record = execute_query("SELECT * FROM Predio WHERE IDpredio = %s", (idPredio,), fetch=True, fetchone=True)
    return jsonify(updated_record), 200

@app.route('/api/v1/predios/<int:idPredio>', methods=['DELETE'])
def eliminar_predio(idPredio):
    existing = execute_query("SELECT 1 FROM Predio WHERE IDpredio = %s", (idPredio,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    execute_query("DELETE FROM Predio WHERE IDpredio = %s", (idPredio,), commit=True)
    return '', 204

# ----------------- TAG: UsuariosPredios -----------------

@app.route('/api/v1/usuarios-predios', methods=['GET'])
def get_usuarios_predios():
    filter_map = {'idUsuario': 'IDusuario', 'idPredio': 'IDpredio'}
    records = get_paginated_and_filtered('Usuario_predio', filter_map)
    return jsonify(records), 200

@app.route('/api/v1/usuarios-predios', methods=['POST'])
def crear_usuario_predio():
    data = request.json
    query, params = build_insert_query('Usuario_predio', data)
    execute_query(query, params, commit=True)
    
    new_record = execute_query("SELECT * FROM Usuario_predio WHERE IDusuario = %s AND IDpredio = %s", 
                               (data['IDusuario'], data['IDpredio']), fetch=True, fetchone=True)
    return jsonify(new_record), 201

@app.route('/api/v1/usuarios-predios/<int:idUsuario>/<int:idPredio>', methods=['GET'])
def get_usuario_predio_by_ids(idUsuario, idPredio):
    record = execute_query("SELECT * FROM Usuario_predio WHERE IDusuario = %s AND IDpredio = %s", 
                           (idUsuario, idPredio), fetch=True, fetchone=True)
    if not record:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    return jsonify(record), 200

@app.route('/api/v1/usuarios-predios/<int:idUsuario>/<int:idPredio>', methods=['PUT'])
def actualizar_usuario_predio(idUsuario, idPredio):
    data = request.json
    existing = execute_query("SELECT 1 FROM Usuario_predio WHERE IDusuario = %s AND IDpredio = %s", 
                             (idUsuario, idPredio), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404

    query, params = build_update_query_composite('Usuario_predio', data, {'IDusuario': idUsuario, 'IDpredio': idPredio})
    if query:
        execute_query(query, params, commit=True)

    updated_record = execute_query("SELECT * FROM Usuario_predio WHERE IDusuario = %s AND IDpredio = %s", 
                                   (idUsuario, idPredio), fetch=True, fetchone=True)
    return jsonify(updated_record), 200

@app.route('/api/v1/usuarios-predios/<int:idUsuario>/<int:idPredio>', methods=['DELETE'])
def eliminar_usuario_predio(idUsuario, idPredio):
    existing = execute_query("SELECT 1 FROM Usuario_predio WHERE IDusuario = %s AND IDpredio = %s", 
                             (idUsuario, idPredio), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
        
    execute_query("DELETE FROM Usuario_predio WHERE IDusuario = %s AND IDpredio = %s", (idUsuario, idPredio), commit=True)
    return '', 204

# ----------------- TAG: ModulosControl -----------------

@app.route('/api/v1/modulos-control', methods=['GET'])
def get_modulos_control():
    records = get_paginated_and_filtered('ModuloControl')
    return jsonify(records), 200

@app.route('/api/v1/modulos-control', methods=['POST'])
def crear_modulo_control():
    data = request.json
    query, params = build_insert_query('ModuloControl', data)
    last_id = execute_query(query, params, commit=True)
    
    new_record = execute_query("SELECT * FROM ModuloControl WHERE ID_Modulo = %s", (last_id,), fetch=True, fetchone=True)
    return jsonify(new_record), 201

@app.route('/api/v1/modulos-control/<int:idModulo>', methods=['GET'])
def get_modulo_control_by_id(idModulo):
    record = execute_query("SELECT * FROM ModuloControl WHERE ID_Modulo = %s", (idModulo,), fetch=True, fetchone=True)
    if not record:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    return jsonify(record), 200

@app.route('/api/v1/modulos-control/<int:idModulo>', methods=['PUT'])
def actualizar_modulo_control(idModulo):
    data = request.json
    existing = execute_query("SELECT 1 FROM ModuloControl WHERE ID_Modulo = %s", (idModulo,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404

    query, params = build_update_query('ModuloControl', data, 'ID_Modulo', idModulo)
    if query:
        execute_query(query, params, commit=True)

    updated_record = execute_query("SELECT * FROM ModuloControl WHERE ID_Modulo = %s", (idModulo,), fetch=True, fetchone=True)
    return jsonify(updated_record), 200

@app.route('/api/v1/modulos-control/<int:idModulo>', methods=['DELETE'])
def eliminar_modulo_control(idModulo):
    existing = execute_query("SELECT 1 FROM ModuloControl WHERE ID_Modulo = %s", (idModulo,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
        
    execute_query("DELETE FROM ModuloControl WHERE ID_Modulo = %s", (idModulo,), commit=True)
    return '', 204

# ----------------- TAG: AreasRiego -----------------

@app.route('/api/v1/areas-riego', methods=['GET'])
def get_areas_riego():
    filter_map = {'idPredio': 'IDpredio', 'id_Modulo': 'ID_Modulo'}
    records = get_paginated_and_filtered('AreaRiego', filter_map)
    return jsonify(records), 200

@app.route('/api/v1/areas-riego', methods=['POST'])
def crear_area_riego():
    data = request.json
    query, params = build_insert_query('AreaRiego', data)
    last_id = execute_query(query, params, commit=True)
    
    new_record = execute_query("SELECT * FROM AreaRiego WHERE ID_Area = %s", (last_id,), fetch=True, fetchone=True)
    return jsonify(new_record), 201

@app.route('/api/v1/areas-riego/<int:idArea>', methods=['GET'])
def get_area_riego_by_id(idArea):
    record = execute_query("SELECT * FROM AreaRiego WHERE ID_Area = %s", (idArea,), fetch=True, fetchone=True)
    if not record:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    return jsonify(record), 200

@app.route('/api/v1/areas-riego/<int:idArea>', methods=['PUT'])
def actualizar_area_riego(idArea):
    data = request.json
    existing = execute_query("SELECT 1 FROM AreaRiego WHERE ID_Area = %s", (idArea,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404

    query, params = build_update_query('AreaRiego', data, 'ID_Area', idArea)
    if query:
        execute_query(query, params, commit=True)

    updated_record = execute_query("SELECT * FROM AreaRiego WHERE ID_Area = %s", (idArea,), fetch=True, fetchone=True)
    return jsonify(updated_record), 200

@app.route('/api/v1/areas-riego/<int:idArea>', methods=['DELETE'])
def eliminar_area_riego(idArea):
    existing = execute_query("SELECT 1 FROM AreaRiego WHERE ID_Area = %s", (idArea,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
        
    execute_query("DELETE FROM AreaRiego WHERE ID_Area = %s", (idArea,), commit=True)
    return '', 204

# ----------------- TAG: Sensores -----------------

@app.route('/api/v1/sensores', methods=['GET'])
def get_sensores():
    filter_map = {'id_Modulo': 'ID_Modulo', 'id_Area': 'ID_Area'}
    records = get_paginated_and_filtered('Sensor', filter_map)
    return jsonify(records), 200

@app.route('/api/v1/sensores', methods=['POST'])
def crear_sensor():
    data = request.json
    query, params = build_insert_query('Sensor', data)
    last_id = execute_query(query, params, commit=True)
    
    new_record = execute_query("SELECT * FROM Sensor WHERE IDsensor = %s", (last_id,), fetch=True, fetchone=True)
    return jsonify(new_record), 201

@app.route('/api/v1/sensores/<int:idSensor>', methods=['GET'])
def get_sensor_by_id(idSensor):
    record = execute_query("SELECT * FROM Sensor WHERE IDsensor = %s", (idSensor,), fetch=True, fetchone=True)
    if not record:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    return jsonify(record), 200

@app.route('/api/v1/sensores/<int:idSensor>', methods=['PUT'])
def actualizar_sensor(idSensor):
    data = request.json
    existing = execute_query("SELECT 1 FROM Sensor WHERE IDsensor = %s", (idSensor,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404

    query, params = build_update_query('Sensor', data, 'IDsensor', idSensor)
    if query:
        execute_query(query, params, commit=True)

    updated_record = execute_query("SELECT * FROM Sensor WHERE IDsensor = %s", (idSensor,), fetch=True, fetchone=True)
    return jsonify(updated_record), 200

@app.route('/api/v1/sensores/<int:idSensor>', methods=['DELETE'])
def eliminar_sensor(idSensor):
    existing = execute_query("SELECT 1 FROM Sensor WHERE IDsensor = %s", (idSensor,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
        
    execute_query("DELETE FROM Sensor WHERE IDsensor = %s", (idSensor,), commit=True)
    return '', 204

# ----------------- TAG: ConfiguracionesCultivo -----------------

@app.route('/api/v1/configuraciones-cultivo', methods=['GET'])
def get_configuraciones_cultivo():
    filter_map = {'id_Area': 'ID_Area'}
    records = get_paginated_and_filtered('ConfiguracionCultivo', filter_map)
    return jsonify(records), 200

@app.route('/api/v1/configuraciones-cultivo', methods=['POST'])
def crear_configuracion_cultivo():
    data = request.json
    query, params = build_insert_query('ConfiguracionCultivo', data)
    last_id = execute_query(query, params, commit=True)
    
    new_record = execute_query("SELECT * FROM ConfiguracionCultivo WHERE ID_Configuracion = %s", (last_id,), fetch=True, fetchone=True)
    return jsonify(new_record), 201

@app.route('/api/v1/configuraciones-cultivo/<int:idConfiguracion>', methods=['GET'])
def get_configuracion_cultivo_by_id(idConfiguracion):
    record = execute_query("SELECT * FROM ConfiguracionCultivo WHERE ID_Configuracion = %s", (idConfiguracion,), fetch=True, fetchone=True)
    if not record:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    return jsonify(record), 200

@app.route('/api/v1/configuraciones-cultivo/<int:idConfiguracion>', methods=['PUT'])
def actualizar_configuracion_cultivo(idConfiguracion):
    data = request.json
    existing = execute_query("SELECT 1 FROM ConfiguracionCultivo WHERE ID_Configuracion = %s", (idConfiguracion,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404

    query, params = build_update_query('ConfiguracionCultivo', data, 'ID_Configuracion', idConfiguracion)
    if query:
        execute_query(query, params, commit=True)

    updated_record = execute_query("SELECT * FROM ConfiguracionCultivo WHERE ID_Configuracion = %s", (idConfiguracion,), fetch=True, fetchone=True)
    return jsonify(updated_record), 200

@app.route('/api/v1/configuraciones-cultivo/<int:idConfiguracion>', methods=['DELETE'])
def eliminar_configuracion_cultivo(idConfiguracion):
    existing = execute_query("SELECT 1 FROM ConfiguracionCultivo WHERE ID_Configuracion = %s", (idConfiguracion,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
        
    execute_query("DELETE FROM ConfiguracionCultivo WHERE ID_Configuracion = %s", (idConfiguracion,), commit=True)
    return '', 204

# ----------------- TAG: MedicionesHistoricas -----------------

@app.route('/api/v1/mediciones-historicas', methods=['GET'])
def get_mediciones_historicas():
    filter_map = {'id_Area': 'ID_Area'}
    records = get_paginated_and_filtered('MedicionHistorica', filter_map)
    return jsonify(records), 200

@app.route('/api/v1/mediciones-historicas', methods=['POST'])
def crear_medicion_historica():
    data = request.json
    query, params = build_insert_query('MedicionHistorica', data)
    last_id = execute_query(query, params, commit=True)
    
    new_record = execute_query("SELECT * FROM MedicionHistorica WHERE ID_Medicion = %s", (last_id,), fetch=True, fetchone=True)
    return jsonify(new_record), 201

@app.route('/api/v1/mediciones-historicas/<int:idMedicion>', methods=['GET'])
def get_medicion_historica_by_id(idMedicion):
    record = execute_query("SELECT * FROM MedicionHistorica WHERE ID_Medicion = %s", (idMedicion,), fetch=True, fetchone=True)
    if not record:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    return jsonify(record), 200

@app.route('/api/v1/mediciones-historicas/<int:idMedicion>', methods=['PUT'])
def actualizar_medicion_historica(idMedicion):
    data = request.json
    existing = execute_query("SELECT 1 FROM MedicionHistorica WHERE ID_Medicion = %s", (idMedicion,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404

    query, params = build_update_query('MedicionHistorica', data, 'ID_Medicion', idMedicion)
    if query:
        execute_query(query, params, commit=True)

    updated_record = execute_query("SELECT * FROM MedicionHistorica WHERE ID_Medicion = %s", (idMedicion,), fetch=True, fetchone=True)
    return jsonify(updated_record), 200

@app.route('/api/v1/mediciones-historicas/<int:idMedicion>', methods=['DELETE'])
def eliminar_medicion_historica(idMedicion):
    existing = execute_query("SELECT 1 FROM MedicionHistorica WHERE ID_Medicion = %s", (idMedicion,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
        
    execute_query("DELETE FROM MedicionHistorica WHERE ID_Medicion = %s", (idMedicion,), commit=True)
    return '', 204

# --- Endpoints dinámicos para gráficas ---

@app.route('/api/v1/mediciones-historicas/historial/<int:idArea>', methods=['GET'])
def get_historial_humedad(idArea):
    """
    Retorna las últimas N mediciones de humedad del área para la gráfica de 24h.
    Query params: ?limite=8 (default 8 barras)
    """
    limite = int(request.args.get('limite', 8))
    registros = execute_query(
        """
        SELECT Humedad_suelo, Fecha
        FROM MedicionHistorica
        WHERE ID_Area = %s AND Humedad_suelo IS NOT NULL
        ORDER BY Fecha DESC
        LIMIT %s
        """,
        (idArea, limite), fetch=True
    ) or []
    # Invertir para que vayan del más antiguo al más reciente
    registros.reverse()
    return jsonify(registros), 200

@app.route('/api/v1/mediciones-historicas/ndvi/<int:idArea>', methods=['GET'])
def get_historial_ndvi(idArea):
    """
    Retorna las últimas N mediciones de NDVI (Desarrollo_vegetativa) del área.
    Query params: ?dias=7 (default 7 puntos)
    """
    dias = int(request.args.get('dias', 7))
    registros = execute_query(
        """
        SELECT Desarrollo_vegetativa, Fecha
        FROM MedicionHistorica
        WHERE ID_Area = %s AND Desarrollo_vegetativa IS NOT NULL
        ORDER BY Fecha DESC
        LIMIT %s
        """,
        (idArea, dias), fetch=True
    ) or []
    registros.reverse()
    return jsonify(registros), 200

# ----------------- TAG: Alertas -----------------

@app.route('/api/v1/alertas', methods=['GET'])
def get_alertas():
    filter_map = {'id_Area': 'ID_area', 'idUsuario': 'IDusuario'}
    records = get_paginated_and_filtered('Alerta', filter_map)
    return jsonify(records), 200

@app.route('/api/v1/alertas', methods=['POST'])
def crear_alerta():
    data = request.json
    query, params = build_insert_query('Alerta', data)
    last_id = execute_query(query, params, commit=True)
    
    new_record = execute_query("SELECT * FROM Alerta WHERE ID_Alerta = %s", (last_id,), fetch=True, fetchone=True)
    return jsonify(new_record), 201

@app.route('/api/v1/alertas/<int:idAlerta>', methods=['GET'])
def get_alerta_by_id(idAlerta):
    record = execute_query("SELECT * FROM Alerta WHERE ID_Alerta = %s", (idAlerta,), fetch=True, fetchone=True)
    if not record:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    return jsonify(record), 200

@app.route('/api/v1/alertas/<int:idAlerta>', methods=['PUT'])
def actualizar_alerta(idAlerta):
    data = request.json
    existing = execute_query("SELECT 1 FROM Alerta WHERE ID_Alerta = %s", (idAlerta,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404

    query, params = build_update_query('Alerta', data, 'ID_Alerta', idAlerta)
    if query:
        execute_query(query, params, commit=True)

    updated_record = execute_query("SELECT * FROM Alerta WHERE ID_Alerta = %s", (idAlerta,), fetch=True, fetchone=True)
    return jsonify(updated_record), 200

@app.route('/api/v1/alertas/<int:idAlerta>', methods=['DELETE'])
def eliminar_alerta(idAlerta):
    existing = execute_query("SELECT 1 FROM Alerta WHERE ID_Alerta = %s", (idAlerta,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
        
    execute_query("DELETE FROM Alerta WHERE ID_Alerta = %s", (idAlerta,), commit=True)
    return '', 204

@app.route('/api/v1/alertas/verificar/<int:idArea>', methods=['GET'])
def verificar_alertas_area(idArea):
    """
    Compara la última medición del área con ConfiguracionCultivo.
    Si la humedad está fuera de rango, crea una alerta automática.
    Retorna las alertas generadas (puede ser 0).
    """
    # Obtener config del cultivo para esta área
    config = execute_query(
        "SELECT RangoHumedadMIN, RangoHumedadMAX FROM ConfiguracionCultivo WHERE ID_Area = %s",
        (idArea,), fetch=True, fetchone=True
    )
    if not config:
        return jsonify({"alertas_generadas": 0, "message": "Sin configuración de cultivo"}), 200

    # Última medición
    medicion = execute_query(
        """
        SELECT Humedad_suelo, Fecha FROM MedicionHistorica
        WHERE ID_Area = %s AND Humedad_suelo IS NOT NULL
        ORDER BY Fecha DESC LIMIT 1
        """,
        (idArea,), fetch=True, fetchone=True
    )
    if not medicion:
        return jsonify({"alertas_generadas": 0, "message": "Sin mediciones"}), 200

    humedad = medicion['Humedad_suelo']
    hmin = config['RangoHumedadMIN']
    hmax = config['RangoHumedadMAX']
    alertas_creadas = []

    # Obtener nombre del área para el mensaje
    area = execute_query("SELECT Nombre FROM AreaRiego WHERE ID_Area = %s", (idArea,), fetch=True, fetchone=True)
    nombre_area = area['Nombre'] if area else f"Área {idArea}"

    if humedad < hmin:
        msg = f"Humedad en {nombre_area}: {humedad}% — bajo el mínimo de {hmin}%"
        q, p = build_insert_query('Alerta', {
            'ID_area': idArea, 'Tipo': 'Baja humedad',
            'Severidad': 'Alta', 'Mensaje': msg
        })
        aid = execute_query(q, p, commit=True)
        alertas_creadas.append({"id": aid, "tipo": "Baja humedad", "mensaje": msg})

    elif humedad > hmax:
        msg = f"Humedad en {nombre_area}: {humedad}% — sobre el máximo de {hmax}%"
        q, p = build_insert_query('Alerta', {
            'ID_area': idArea, 'Tipo': 'Alta humedad',
            'Severidad': 'Media', 'Mensaje': msg
        })
        aid = execute_query(q, p, commit=True)
        alertas_creadas.append({"id": aid, "tipo": "Alta humedad", "mensaje": msg})

    return jsonify({"alertas_generadas": len(alertas_creadas), "alertas": alertas_creadas}), 200

# ----------------- TAG: RegistrosAuditoria -----------------

@app.route('/api/v1/registros-auditoria', methods=['GET'])
def get_registros_auditoria():
    filter_map = {'idUsuario': 'IDusuario', 'id_Area': 'ID_Area'}
    records = get_paginated_and_filtered('RegistroAuditoria', filter_map)
    return jsonify(records), 200

@app.route('/api/v1/registros-auditoria', methods=['POST'])
def crear_registro_auditoria():
    data = request.json
    query, params = build_insert_query('RegistroAuditoria', data)
    last_id = execute_query(query, params, commit=True)
    
    new_record = execute_query("SELECT * FROM RegistroAuditoria WHERE IDregistro = %s", (last_id,), fetch=True, fetchone=True)
    return jsonify(new_record), 201

@app.route('/api/v1/registros-auditoria/<int:idRegistro>', methods=['GET'])
def get_registro_auditoria_by_id(idRegistro):
    record = execute_query("SELECT * FROM RegistroAuditoria WHERE IDregistro = %s", (idRegistro,), fetch=True, fetchone=True)
    if not record:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    return jsonify(record), 200

@app.route('/api/v1/registros-auditoria/<int:idRegistro>', methods=['PUT'])
def actualizar_registro_auditoria(idRegistro):
    data = request.json
    existing = execute_query("SELECT 1 FROM RegistroAuditoria WHERE IDregistro = %s", (idRegistro,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404

    query, params = build_update_query('RegistroAuditoria', data, 'IDregistro', idRegistro)
    if query:
        execute_query(query, params, commit=True)

    updated_record = execute_query("SELECT * FROM RegistroAuditoria WHERE IDregistro = %s", (idRegistro,), fetch=True, fetchone=True)
    return jsonify(updated_record), 200

@app.route('/api/v1/registros-auditoria/<int:idRegistro>', methods=['DELETE'])
def eliminar_registro_auditoria(idRegistro):
    existing = execute_query("SELECT 1 FROM RegistroAuditoria WHERE IDregistro = %s", (idRegistro,), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
        
    execute_query("DELETE FROM RegistroAuditoria WHERE IDregistro = %s", (idRegistro,), commit=True)
    return '', 204

# ----------------- TAG: Clima (Open-Meteo) -----------------

import urllib.request
import json as _json

def _fetch_open_meteo(lat, lon):
    """
    Llama a Open-Meteo y retorna un dict con los campos
    que mapean directamente a columnas de MedicionHistorica.
    Sin dependencias externas: usa urllib de la stdlib.
    """
    params = (
        f"latitude={lat}&longitude={lon}"
        "&current=temperature_2m,relative_humidity_2m,"
        "wind_speed_10m,shortwave_radiation,precipitation"
        "&daily=temperature_2m_max,temperature_2m_min,"
        "precipitation_sum,et0_fao_evapotranspiration"
        "&timezone=America%2FChihuahua"
        "&forecast_days=1"
    )
    url = f"https://api.open-meteo.com/v1/forecast?{params}"
    with urllib.request.urlopen(url, timeout=10) as resp:
        data = _json.loads(resp.read().decode())

    c = data["current"]
    d = data["daily"]

    return {
        "Temp_Ambiental":     c["temperature_2m"],
        "Humedad_Relativa":   c["relative_humidity_2m"],
        "Velocidad_Viento":   c["wind_speed_10m"],
        "Radiacion_Sol":      c["shortwave_radiation"],
        "Evapotranspiracion": d["et0_fao_evapotranspiration"][0],
    }


def _generate_random_measurement_values():
    return {
        "Temperatura_Suelo":     round(random.uniform(20.0, 35.0), 1),
        "Humedad_suelo":         round(random.uniform(10.0, 40.0), 1),
        "Evapotranspiracion":    round(random.uniform(1.5, 6.5), 2),
        "Conductividad_suelo":   round(random.uniform(0.5, 3.0), 2),
        "consumo_agua":          round(random.uniform(50.0, 250.0), 1),
        "Desarrollo_vegetativa": round(random.uniform(0.3, 1.0), 2),
        "Potencial_Hidrico":     round(random.uniform(-3.0, -0.5), 2),
        "Consumo_Diario_Prom":   round(random.uniform(80.0, 160.0), 1),
        "Consumo_Acum":          round(random.uniform(800.0, 1800.0), 1),
    }


def _get_default_area_for_periodic_post():
    return execute_query(
        """
        SELECT a.ID_Area, p.Latitud, p.Longitud
        FROM AreaRiego a
        JOIN Predio p ON a.IDpredio = p.IDpredio
        WHERE p.Latitud IS NOT NULL AND p.Longitud IS NOT NULL
        ORDER BY a.ID_Area
        LIMIT 1
        """,
        fetch=True, fetchone=True
    )


def _insert_periodic_medicion(area_record):
    try:
        datos_clima = _fetch_open_meteo(float(area_record["Latitud"]), float(area_record["Longitud"]))
    except Exception as e:
        logging.warning("Error al consultar Open-Meteo para el post periódico: %s", str(e))
        return None

    datos = {"ID_Area": area_record["ID_Area"]}
    datos.update(datos_clima)
    datos.update(_generate_random_measurement_values())

    query, params = build_insert_query("MedicionHistorica", datos)
    return execute_query(query, params, commit=True)


def _periodic_medicion_loop(interval_seconds=600):
    while True:
        area_record = _get_default_area_for_periodic_post()
        if area_record:
            inserted_id = _insert_periodic_medicion(area_record)
            if inserted_id:
                logging.info(
                    "Inserción periódica MedicionHistorica ID %s para área %s",
                    inserted_id,
                    area_record["ID_Area"],
                )
            else:
                logging.warning(
                    "No se insertó medición periódica para área %s",
                    area_record["ID_Area"],
                )
        else:
            logging.warning("No se encontró un área válida con coordenadas para la medición periódica.")
        time.sleep(interval_seconds)


def start_periodic_medicion_scheduler(interval_seconds=600):
    thread = threading.Thread(
        target=_periodic_medicion_loop,
        args=(interval_seconds,),
        daemon=True,
    )
    thread.start()


@app.route('/api/v1/clima/sincronizar/<int:idArea>', methods=['POST'])
def sincronizar_clima(idArea):
    """
    1. Verifica que el área exista y obtiene su predio.
    2. Lee Latitud/Longitud del predio.
    3. Llama a Open-Meteo.
    4. Inserta una nueva fila en MedicionHistorica con los datos
       climáticos (los campos de suelo/riego quedan en NULL para
       que no pisen lecturas previas del sensor).
    5. Retorna el registro recién creado.
    """
    area = execute_query(
        "SELECT * FROM AreaRiego WHERE ID_Area = %s",
        (idArea,), fetch=True, fetchone=True
    )
    if not area:
        return jsonify({"code": 404, "message": "Área no encontrada"}), 404

    predio = execute_query(
        "SELECT Latitud, Longitud FROM Predio WHERE IDpredio = %s",
        (area["IDpredio"],), fetch=True, fetchone=True
    )
    if not predio or predio["Latitud"] is None or predio["Longitud"] is None:
        return jsonify({"code": 422, "message": "El predio no tiene coordenadas configuradas"}), 422

    try:
        datos_clima = _fetch_open_meteo(float(predio["Latitud"]), float(predio["Longitud"]))
    except Exception as e:
        return jsonify({"code": 502, "message": f"Error al consultar Open-Meteo: {str(e)}"}), 502

    datos = {"ID_Area": idArea}
    datos.update(datos_clima)
    datos.update(_generate_random_measurement_values())

    query, params = build_insert_query("MedicionHistorica", datos)
    last_id = execute_query(query, params, commit=True)

    nuevo_registro = execute_query(
        "SELECT * FROM MedicionHistorica WHERE ID_Medicion = %s",
        (last_id,), fetch=True, fetchone=True
    )
    return jsonify(nuevo_registro), 201


@app.route('/api/v1/clima/ultimo/<int:idArea>', methods=['GET'])
def get_ultimo_clima(idArea):
    """
    Retorna la medición climática más reciente para un área
    (solo filas que tengan Temp_Ambiental, es decir, las de Open-Meteo).
    """
    record = execute_query(
        """
        SELECT ID_Medicion, ID_Area, Fecha,
               Temp_Ambiental, Humedad_Relativa,
               Velocidad_Viento, Radiacion_Sol, Evapotranspiracion
        FROM MedicionHistorica
        WHERE ID_Area = %s AND Temp_Ambiental IS NOT NULL
        ORDER BY Fecha DESC
        LIMIT 1
        """,
        (idArea,), fetch=True, fetchone=True
    )
    if not record:
        return jsonify({"code": 404, "message": "Sin datos climáticos para esta área"}), 404
    return jsonify(record), 200


if __name__ == '__main__':
    # Entorno de desarrollo. En producción, utilizar Gunicorn o uWSGI
    if not app.debug or os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
        start_periodic_medicion_scheduler()

    app.run(host='0.0.0.0', port=3000, debug=True)