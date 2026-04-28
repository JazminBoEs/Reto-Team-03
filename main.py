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
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
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
TOKEN_TTL_SECONDS = 24 * 60 * 60
_token_serializer = URLSafeTimedSerializer(JWT_SECRET, salt='irrigo-auth')
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
    """Genera token de sesión con expiración de 24 horas."""
    payload = {
        "sub": str(user_id),
        "email": email,
        "roles": roles,
        "iat": datetime.utcnow().timestamp(),
    }
    if _JWT_AVAILABLE:
        jwt_payload = {
            **payload,
            "iat": datetime.utcnow(),
            "exp": datetime.utcnow() + timedelta(hours=24),
        }
        return pyjwt.encode(jwt_payload, JWT_SECRET, algorithm="HS256")
    return _token_serializer.dumps(payload)

def jwt_required(f):
    """Decorador que valida JWT y adjunta payload a g.usuario_actual"""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.headers.get('Authorization', '')
        token = auth.replace('Bearer ', '').strip()
        if not token:
            return jsonify({"code": 401, "message": "Token de autenticación requerido"}), 401
        try:
            if _JWT_AVAILABLE:
                # Compatibilidad: aceptar tokens antiguos con claim `sub` numérico.
                payload = pyjwt.decode(
                    token,
                    JWT_SECRET,
                    algorithms=["HS256"],
                    options={"verify_sub": False}
                )
            else:
                payload = _token_serializer.loads(token, max_age=TOKEN_TTL_SECONDS)
            g.usuario_actual = payload
        except (pyjwt.ExpiredSignatureError if _JWT_AVAILABLE else SignatureExpired):
            return jsonify({"code": 401, "message": "Token expirado, inicia sesión de nuevo"}), 401
        except (pyjwt.InvalidTokenError if _JWT_AVAILABLE else BadSignature):
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


def get_user_with_predios(user_id):
    """Retorna usuario (sin contraseña) y sus membresías de predio activas."""
    user = execute_query(
        "SELECT IDusuario, Nombre, Apellido, Email, Telefono FROM Usuario WHERE IDusuario = %s",
        (user_id,),
        fetch=True,
        fetchone=True,
    )
    if not user:
        return None, []

    roles_db = execute_query(
        """
        SELECT up.IDpredio, up.Admin, up.Rol, up.Alcance, up.Area_Permitida,
               p.NombrePredio, p.CodigoAcceso
        FROM Usuario_predio up
        JOIN Predio p ON p.IDpredio = up.IDpredio
        WHERE up.IDusuario = %s AND up.Activo = TRUE
        ORDER BY up.Fecha_Asignacion ASC
        """,
        (user_id,),
        fetch=True,
    ) or []

    roles_payload = [
        {
            "predio": r['IDpredio'],
            "rol": r['Rol'],
            "alcance": r['Alcance'],
            "area": r['Area_Permitida'],
            "nombrePredio": r['NombrePredio'],
            "codigoAcceso": r['CodigoAcceso'],
            "admin": bool(r['Admin'])
        }
        for r in roles_db
    ]

    user['predios'] = roles_payload
    user['esAdmin'] = any(r['Rol'] == 'admin' for r in roles_db)
    user['predioActual'] = roles_db[0]['IDpredio'] if roles_db else None
    user['areaPermitida'] = roles_db[0]['Area_Permitida'] if roles_db else None
    user['alcance'] = roles_db[0]['Alcance'] if roles_db else 'todo'
    return user, roles_payload


def get_authenticated_user_id():
    sub = g.usuario_actual.get('sub')
    return int(sub) if sub is not None else None


def get_user_predio_relation(user_id, id_predio):
    return execute_query(
        """
        SELECT IDusuario, IDpredio, Rol, Alcance, Area_Permitida, Activo
        FROM Usuario_predio
        WHERE IDusuario = %s AND IDpredio = %s AND Activo = TRUE
        """,
        (user_id, id_predio),
        fetch=True,
        fetchone=True,
    )


def can_access_predio(user_id, id_predio):
    return get_user_predio_relation(user_id, id_predio) is not None


def get_area_with_predio(id_area):
    return execute_query(
        "SELECT ID_Area, IDpredio FROM AreaRiego WHERE ID_Area = %s",
        (id_area,),
        fetch=True,
        fetchone=True,
    )


def get_area_access_relation(user_id, id_area):
    return execute_query(
        """
        SELECT up.IDusuario, up.IDpredio, up.Rol, up.Alcance, up.Area_Permitida
        FROM Usuario_predio up
        JOIN AreaRiego a ON a.IDpredio = up.IDpredio
        WHERE up.IDusuario = %s AND a.ID_Area = %s AND up.Activo = TRUE
        """,
        (user_id, id_area),
        fetch=True,
        fetchone=True,
    )


def can_access_area(user_id, id_area):
    rel = get_area_access_relation(user_id, id_area)
    if not rel:
        return False
    if rel['Rol'] == 'admin':
        return True
    if rel['Alcance'] == 'uno':
        return rel['Area_Permitida'] == id_area
    return True

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

    user_db = execute_query("SELECT * FROM Usuario WHERE Email = %s", (data['Email'],), fetch=True, fetchone=True)

    if user_db and check_password_hash(user_db['Contrasena'], data['Contrasena']):
        user, roles_payload = get_user_with_predios(user_db['IDusuario'])
        token = generar_token(user['IDusuario'], user['Email'], roles_payload)
        requiere_cambio = bool(user_db.get('RequiereCambioPassword', False))
        return jsonify({"token": token, "usuario": user, "requiereCambioPassword": requiere_cambio}), 200

    return jsonify({"code": 401, "message": "No autorizado, credenciales inválidas"}), 401


@app.route('/api/v1/auth/me', methods=['GET'])
@jwt_required
def auth_me():
    user_id = get_authenticated_user_id()
    user, _roles_payload = get_user_with_predios(user_id)
    if not user:
        return jsonify({"code": 404, "message": "Usuario no encontrado"}), 404
    user_db = execute_query(
        "SELECT RequiereCambioPassword FROM Usuario WHERE IDusuario = %s",
        (user_id,),
        fetch=True,
        fetchone=True,
    ) or {}
    return jsonify({"usuario": user, "requiereCambioPassword": bool(user_db.get('RequiereCambioPassword', False))}), 200


@app.route('/api/v1/usuarios/cambiar-contrasena', methods=['POST'])
@jwt_required
def cambiar_contrasena_obligatoria():
    data = request.json or {}
    nueva = data.get('nuevaContrasena', '')
    ok, err = validar_contrasena(nueva)
    if not ok:
        return jsonify({"code": 400, "message": err}), 400

    user_id = get_authenticated_user_id()
    execute_query(
        """
        UPDATE Usuario
        SET Contrasena = %s,
            FechaUltimoCambioPassword = CURRENT_TIMESTAMP,
            RequiereCambioPassword = FALSE
        WHERE IDusuario = %s
        """,
        (generate_password_hash(nueva), user_id),
        commit=True,
    )
    return jsonify({"message": "Contraseña actualizada correctamente"}), 200


@app.route('/api/v1/registro', methods=['POST'])
def registro_usuario():
    """Registro inicial sin rol global ni asignación de predio."""
    data = request.json or {}

    for campo in ['Nombre', 'Email', 'Contrasena']:
        if not data.get(campo):
            return jsonify({"code": 400, "message": f"{campo} es requerido"}), 400

    ok, err = validar_contrasena(data['Contrasena'])
    if not ok:
        return jsonify({"code": 400, "message": err}), 400

    existe = execute_query(
        "SELECT 1 FROM Usuario WHERE Email = %s",
        (data['Email'],),
        fetch=True,
        fetchone=True
    )
    if existe:
        return jsonify({"code": 409, "message": "Ya existe una cuenta con ese correo electrónico"}), 409

    contrasena_hash = generate_password_hash(data['Contrasena'])
    user_data = {
        'Nombre': data['Nombre'],
        'Apellido': data.get('Apellido', ''),
        'Email': data['Email'],
        'Contrasena': contrasena_hash,
        'Telefono': data.get('Telefono', ''),
        'RequiereCambioPassword': False
    }

    q, p = build_insert_query('Usuario', user_data)
    user_id = execute_query(q, p, commit=True)

    user = execute_query(
        "SELECT IDusuario, Nombre, Apellido, Email, Telefono FROM Usuario WHERE IDusuario = %s",
        (user_id,),
        fetch=True,
        fetchone=True,
    )

    return jsonify({
        "message": "Cuenta creada exitosamente",
        "requiereOnboarding": True,
        "usuario": user
    }), 201


@app.route('/api/v1/predios/onboarding/crear', methods=['POST'])
@jwt_required
def crear_predio_onboarding():
    data = request.json or {}
    if not data.get('NombrePredio'):
        return jsonify({"code": 400, "message": "NombrePredio es requerido"}), 400

    user_id = get_authenticated_user_id()
    codigo = generar_codigo_acceso()
    predio_data = {
        'CodigoAcceso': codigo,
        'NombrePredio': data['NombrePredio'],
        'Ubicacion': data.get('Ubicacion', ''),
        'Latitud': data.get('Latitud') or None,
        'Longitud': data.get('Longitud') or None
    }
    q, p = build_insert_query('Predio', predio_data)
    predio_id = execute_query(q, p, commit=True)

    q2, p2 = build_insert_query('Usuario_predio', {
        'IDusuario': user_id,
        'IDpredio': predio_id,
        'Admin': True,
        'Rol': 'admin',
        'Alcance': 'todo'
    })
    execute_query(q2, p2, commit=True)

    predio = execute_query(
        "SELECT * FROM Predio WHERE IDpredio = %s",
        (predio_id,),
        fetch=True,
        fetchone=True
    )
    return jsonify({
        "message": "Predio creado exitosamente",
        "predio": predio,
        "codigoAcceso": codigo
    }), 201


@app.route('/api/v1/predios/onboarding/solicitar-acceso', methods=['POST'])
@jwt_required
def solicitar_acceso_predio_onboarding():
    data = request.json or {}
    codigo = data.get('codigoAcceso', '').strip().upper()
    if len(codigo) != 8:
        return jsonify({"code": 400, "message": "El código de acceso debe tener 8 caracteres"}), 400

    user_id = get_authenticated_user_id()
    predio = execute_query(
        "SELECT IDpredio, NombrePredio, Ubicacion FROM Predio WHERE CodigoAcceso = %s",
        (codigo,),
        fetch=True,
        fetchone=True
    )
    if not predio:
        return jsonify({"code": 404, "message": "Código de acceso no válido"}), 404

    existente = execute_query(
        "SELECT 1 FROM Usuario_predio WHERE IDusuario = %s AND IDpredio = %s",
        (user_id, predio['IDpredio']),
        fetch=True,
        fetchone=True,
    )
    if existente:
        return jsonify({"code": 400, "message": "Ya tienes acceso a este predio"}), 400

    q, p = build_insert_query('Usuario_predio', {
        'IDusuario': user_id,
        'IDpredio': predio['IDpredio'],
        'Admin': False,
        'Rol': 'lector',
        'Alcance': 'todo'
    })
    execute_query(q, p, commit=True)

    return jsonify({
        "message": "Acceso concedido como lector",
        "predio": predio
    }), 201


@app.route('/api/v1/usuarios/mis-predios', methods=['GET'])
@jwt_required
def get_mis_predios():
    user_id = get_authenticated_user_id()
    roles_db = execute_query(
        """
        SELECT up.IDpredio, up.Admin, up.Rol, up.Alcance, up.Area_Permitida,
               p.NombrePredio, p.Ubicacion, p.CodigoAcceso
        FROM Usuario_predio up
        JOIN Predio p ON p.IDpredio = up.IDpredio
        WHERE up.IDusuario = %s AND up.Activo = TRUE
        ORDER BY up.Fecha_Asignacion ASC
        """,
        (user_id,),
        fetch=True,
    ) or []

    predios = [
        {
            "IDpredio": r['IDpredio'],
            "NombrePredio": r['NombrePredio'],
            "Ubicacion": r['Ubicacion'],
            "CodigoAcceso": r['CodigoAcceso'],
            "Rol": r['Rol'],
            "Admin": bool(r['Admin']),
            "Alcance": r['Alcance'],
            "Area_Permitida": r['Area_Permitida']
        }
        for r in roles_db
    ]
    return jsonify(predios), 200

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
        ok, err = validar_contrasena(data['Contrasena'])
        if not ok:
            return jsonify({"code": 400, "message": err}), 400
        data['Contrasena'] = generate_password_hash(data['Contrasena'])
        data['FechaUltimoCambioPassword'] = datetime.utcnow()
        data['RequiereCambioPassword'] = False

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
    user_id = get_authenticated_user_id()
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
@jwt_required
def get_predios():
    user_id = get_authenticated_user_id()
    records = execute_query(
        """
        SELECT p.*
        FROM Predio p
        JOIN Usuario_predio up ON up.IDpredio = p.IDpredio
        WHERE up.IDusuario = %s AND up.Activo = TRUE
        ORDER BY p.IDpredio ASC
        """,
        (user_id,),
        fetch=True,
    ) or []
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
@jwt_required
def get_predio_by_id(idPredio):
    user_id = get_authenticated_user_id()
    if not can_access_predio(user_id, idPredio):
        return jsonify({"code": 403, "message": "Sin acceso a este predio"}), 403
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
    existing = execute_query("SELECT Rol, Admin FROM Usuario_predio WHERE IDusuario = %s AND IDpredio = %s", 
                             (idUsuario, idPredio), fetch=True, fetchone=True)
    if not existing:
        return jsonify({"code": 404, "message": "No encontrado"}), 404

    nuevo_rol = data.get('Rol')
    nuevo_admin = data.get('Admin')
    intenta_degradar = nuevo_rol == 'lector' or ('Admin' in data and nuevo_admin in (False, 0, '0', 'false', 'False'))
    if existing['Rol'] == 'admin' and intenta_degradar:
        return jsonify({"code": 403, "message": "Un administrador del predio no puede convertirse en lector"}), 403

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
@jwt_required
def get_areas_riego():
    id_predio = request.args.get('idPredio', type=int)
    if not id_predio:
        return jsonify({"code": 400, "message": "idPredio es requerido"}), 400

    user_id = get_authenticated_user_id()
    rel = get_user_predio_relation(user_id, id_predio)
    if not rel:
        return jsonify({"code": 403, "message": "Sin acceso a este predio"}), 403

    if rel['Rol'] == 'lector' and rel['Alcance'] == 'uno' and rel['Area_Permitida']:
        records = execute_query(
            "SELECT * FROM AreaRiego WHERE IDpredio = %s AND ID_Area = %s",
            (id_predio, rel['Area_Permitida']),
            fetch=True,
        ) or []
    else:
        records = execute_query(
            "SELECT * FROM AreaRiego WHERE IDpredio = %s",
            (id_predio,),
            fetch=True,
        ) or []
    return jsonify(records), 200

@app.route('/api/v1/areas-riego', methods=['POST'])
def crear_area_riego():
    data = request.json
    query, params = build_insert_query('AreaRiego', data)
    last_id = execute_query(query, params, commit=True)
    
    new_record = execute_query("SELECT * FROM AreaRiego WHERE ID_Area = %s", (last_id,), fetch=True, fetchone=True)
    return jsonify(new_record), 201

@app.route('/api/v1/areas-riego/<int:idArea>', methods=['GET'])
@jwt_required
def get_area_riego_by_id(idArea):
    user_id = get_authenticated_user_id()
    if not can_access_area(user_id, idArea):
        return jsonify({"code": 403, "message": "Sin acceso a esta área"}), 403
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
@jwt_required
def get_sensores():
    id_predio = request.args.get('idPredio', type=int)
    if not id_predio:
        return jsonify({"code": 400, "message": "idPredio es requerido"}), 400

    user_id = get_authenticated_user_id()
    if not can_access_predio(user_id, id_predio):
        return jsonify({"code": 403, "message": "Sin acceso a este predio"}), 403

    records = execute_query(
        """
        SELECT s.*
        FROM Sensor s
        JOIN AreaRiego a ON a.ID_Area = s.ID_Area
        WHERE a.IDpredio = %s
        """,
        (id_predio,),
        fetch=True,
    ) or []
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
@jwt_required
def get_configuraciones_cultivo():
    id_predio = request.args.get('idPredio', type=int)
    if not id_predio:
        return jsonify({"code": 400, "message": "idPredio es requerido"}), 400

    user_id = get_authenticated_user_id()
    if not can_access_predio(user_id, id_predio):
        return jsonify({"code": 403, "message": "Sin acceso a este predio"}), 403

    records = execute_query(
        """
        SELECT c.*
        FROM ConfiguracionCultivo c
        JOIN AreaRiego a ON a.ID_Area = c.ID_Area
        WHERE a.IDpredio = %s
        """,
        (id_predio,),
        fetch=True,
    ) or []
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
@jwt_required
def get_mediciones_historicas():
    id_predio = request.args.get('idPredio', type=int)
    if not id_predio:
        return jsonify({"code": 400, "message": "idPredio es requerido"}), 400

    user_id = get_authenticated_user_id()
    if not can_access_predio(user_id, id_predio):
        return jsonify({"code": 403, "message": "Sin acceso a este predio"}), 403

    records = execute_query(
        """
        SELECT m.*
        FROM MedicionHistorica m
        JOIN AreaRiego a ON a.ID_Area = m.ID_Area
        WHERE a.IDpredio = %s
        ORDER BY m.Fecha ASC
        """,
        (id_predio,),
        fetch=True,
    ) or []
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
@jwt_required
def get_historial_humedad(idArea):
    """
    Retorna las últimas N mediciones de humedad del área para la gráfica de 24h.
    Query params: ?limite=8 (default 8 barras)
    """
    limite = int(request.args.get('limite', 8))
    user_id = get_authenticated_user_id()
    if not can_access_area(user_id, idArea):
        return jsonify({"code": 403, "message": "Sin acceso a esta área"}), 403
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
@jwt_required
def get_historial_ndvi(idArea):
    """
    Retorna las últimas N mediciones de NDVI (Desarrollo_vegetativa) del área.
    Query params: ?dias=7 (default 7 puntos)
    """
    dias = int(request.args.get('dias', 7))
    user_id = get_authenticated_user_id()
    if not can_access_area(user_id, idArea):
        return jsonify({"code": 403, "message": "Sin acceso a esta área"}), 403
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
@jwt_required
def get_alertas():
    id_predio = request.args.get('idPredio', type=int)
    if not id_predio:
        return jsonify({"code": 400, "message": "idPredio es requerido"}), 400

    user_id = get_authenticated_user_id()
    if not can_access_predio(user_id, id_predio):
        return jsonify({"code": 403, "message": "Sin acceso a este predio"}), 403

    records = execute_query(
        """
        SELECT a.*
        FROM Alerta a
        JOIN AreaRiego ar ON ar.ID_Area = a.ID_area
        WHERE ar.IDpredio = %s
        ORDER BY a.Fecha DESC
        """,
        (id_predio,),
        fetch=True,
    ) or []
    return jsonify(records), 200

@app.route('/api/v1/alertas', methods=['POST'])
def crear_alerta():
    data = request.json
    query, params = build_insert_query('Alerta', data)
    last_id = execute_query(query, params, commit=True)
    
    new_record = execute_query("SELECT * FROM Alerta WHERE ID_Alerta = %s", (last_id,), fetch=True, fetchone=True)
    return jsonify(new_record), 201

@app.route('/api/v1/alertas/<int:idAlerta>', methods=['GET'])
@jwt_required
def get_alerta_by_id(idAlerta):
    user_id = get_authenticated_user_id()
    area_info = execute_query(
        """
        SELECT a.ID_area
        FROM Alerta a
        WHERE a.ID_Alerta = %s
        """,
        (idAlerta,),
        fetch=True,
        fetchone=True,
    )
    if not area_info:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    if not can_access_area(user_id, area_info['ID_area']):
        return jsonify({"code": 403, "message": "Sin acceso a esta alerta"}), 403

    record = execute_query("SELECT * FROM Alerta WHERE ID_Alerta = %s", (idAlerta,), fetch=True, fetchone=True)
    if not record:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    return jsonify(record), 200

@app.route('/api/v1/alertas/<int:idAlerta>', methods=['PUT'])
@jwt_required
def actualizar_alerta(idAlerta):
    user_id = get_authenticated_user_id()
    area_info = execute_query(
        "SELECT ID_area FROM Alerta WHERE ID_Alerta = %s",
        (idAlerta,),
        fetch=True,
        fetchone=True,
    )
    if not area_info:
        return jsonify({"code": 404, "message": "No encontrado"}), 404
    if not can_access_area(user_id, area_info['ID_area']):
        return jsonify({"code": 403, "message": "Sin acceso a esta alerta"}), 403

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
@jwt_required
def verificar_alertas_area(idArea):
    """
    Compara la última medición del área con ConfiguracionCultivo.
    Si la humedad está fuera de rango, crea una alerta automática.
    Retorna las alertas generadas (puede ser 0).
    """
    user_id = get_authenticated_user_id()
    if not can_access_area(user_id, idArea):
        return jsonify({"code": 403, "message": "Sin acceso a esta área"}), 403

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


def _env_flag(name, default=False):
    value = os.environ.get(name)
    if value is None:
        return default
    return str(value).strip().lower() in ('1', 'true', 'yes', 'on')


def bootstrap_dev_admin_credentials():
    """
    En desarrollo, asegura que la cuenta admin de seed pueda iniciar sesión
    con credenciales conocidas, siempre almacenando hash.
    """
    admin_email = os.environ.get('IRRIGO_ADMIN_EMAIL', 'admin@irrigo.com').strip().lower()
    admin_password = os.environ.get('IRRIGO_ADMIN_PASSWORD', 'Admin123!')

    if not admin_email or not admin_password:
        logging.warning('Bootstrap admin omitido: IRRIGO_ADMIN_EMAIL/IRRIGO_ADMIN_PASSWORD inválidos.')
        return

    admin_user = execute_query(
        "SELECT IDusuario, Contrasena FROM Usuario WHERE LOWER(Email) = %s",
        (admin_email,),
        fetch=True,
        fetchone=True,
    )

    if not admin_user:
        logging.warning('Bootstrap admin: no existe usuario con email %s', admin_email)
        return

    if check_password_hash(admin_user['Contrasena'], admin_password):
        logging.info('Bootstrap admin: credenciales ya sincronizadas para %s', admin_email)
        return

    execute_query(
        """
        UPDATE Usuario
        SET Contrasena = %s,
            FechaUltimoCambioPassword = CURRENT_TIMESTAMP,
            RequiereCambioPassword = FALSE
        WHERE IDusuario = %s
        """,
        (generate_password_hash(admin_password), admin_user['IDusuario']),
        commit=True,
    )
    logging.info('Bootstrap admin: contraseña actualizada para %s', admin_email)


@app.route('/api/v1/clima/sincronizar/<int:idArea>', methods=['POST'])
@jwt_required
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
    user_id = get_authenticated_user_id()
    if not can_access_area(user_id, idArea):
        return jsonify({"code": 403, "message": "Sin acceso a esta área"}), 403

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
@jwt_required
def get_ultimo_clima(idArea):
    """
    Retorna la medición climática más reciente para un área
    (solo filas que tengan Temp_Ambiental, es decir, las de Open-Meteo).
    """
    user_id = get_authenticated_user_id()
    if not can_access_area(user_id, idArea):
        return jsonify({"code": 403, "message": "Sin acceso a esta área"}), 403

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
        if _env_flag('IRRIGO_BOOTSTRAP_ADMIN_ON_START', default=True):
            bootstrap_dev_admin_credentials()
        start_periodic_medicion_scheduler()

    app.run(host='0.0.0.0', port=3000, debug=_env_flag('FLASK_DEBUG', default=False))