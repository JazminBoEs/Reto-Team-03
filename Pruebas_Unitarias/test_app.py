from unittest.mock import patch
from werkzeug.security import generate_password_hash
from main import generar_token


def auth_headers(user_id=1, email="user@example.com", roles=None):
    token = generar_token(user_id, email, roles or [])
    return {"Authorization": f"Bearer {token}"}


class TestAuthFlows:
    def test_registro_crea_usuario_sin_rol(self, test_client):
        with patch(
            "main.execute_query",
            side_effect=[
                None,
                10,
                {
                    "IDusuario": 10,
                    "Nombre": "Ana",
                    "Apellido": "Lopez",
                    "Email": "ana@example.com",
                    "Telefono": "",
                },
            ],
        ) as mock_eq:
            response = test_client.post(
                "/api/v1/registro",
                json={
                    "Nombre": "Ana",
                    "Apellido": "Lopez",
                    "Email": "ana@example.com",
                    "Contrasena": "Secure!123",
                },
            )

        assert response.status_code == 201
        assert response.json["requiereOnboarding"] is True
        assert response.json["usuario"]["IDusuario"] == 10
        assert mock_eq.call_count == 3

    def test_registro_email_duplicado_retorna_409(self, test_client):
        with patch("main.execute_query", return_value={"ok": 1}) as mock_eq:
            response = test_client.post(
                "/api/v1/registro",
                json={
                    "Nombre": "Ana",
                    "Email": "ana@example.com",
                    "Contrasena": "Secure!123",
                },
            )

        assert response.status_code == 409
        assert response.json["code"] == 409
        mock_eq.assert_called_once()

    def test_login_usuario_success_incluye_token_y_predios(self, test_client):
        user_db = {
            "IDusuario": 5,
            "Nombre": "Ana",
            "Apellido": "Lopez",
            "Email": "ana@example.com",
            "Contrasena": generate_password_hash("Secure!123"),
            "Telefono": "",
        }
        user_sin_password = {
            "IDusuario": 5,
            "Nombre": "Ana",
            "Apellido": "Lopez",
            "Email": "ana@example.com",
            "Telefono": "",
        }
        roles = [
            {
                "IDpredio": 1,
                "Admin": True,
                "NombrePredio": "Rancho Norte",
                "CodigoAcceso": "AB12CD34",
            }
        ]

        with patch("main.execute_query", side_effect=[user_db, user_sin_password, roles]):
            response = test_client.post(
                "/api/v1/usuarios/login",
                json={"Email": "ana@example.com", "Contrasena": "Secure!123"},
            )

        assert response.status_code == 200
        assert "token" in response.json
        assert response.json["usuario"]["predios"][0]["admin"] is True


class TestUsuariosCollection:
    def test_get_usuarios_success(self, test_client):
        usuarios = [
            {"IDusuario": 1, "Email": "user@example.com", "Contrasena": "secret"},
            {"IDusuario": 2, "Email": "other@example.com", "Contrasena": "secret2"},
        ]

        with patch("main.execute_query", return_value=usuarios) as mock_eq:
            response = test_client.get("/api/v1/usuarios")

        assert response.status_code == 200
        assert response.json == [
            {"IDusuario": 1, "Email": "user@example.com"},
            {"IDusuario": 2, "Email": "other@example.com"},
        ]
        mock_eq.assert_called_once()

    def test_post_usuarios_success(self, test_client):
        created_user = {"IDusuario": 1, "Email": "user@example.com", "Contrasena": "hashed"}

        with patch("main.execute_query", side_effect=[1, created_user]) as mock_eq:
            response = test_client.post(
                "/api/v1/usuarios",
                json={"Email": "user@example.com", "Contrasena": "password"},
            )

        assert response.status_code == 201
        assert response.json == {"IDusuario": 1, "Email": "user@example.com"}
        assert mock_eq.call_count == 2

    def test_login_usuario_missing_fields_returns_400(self, test_client):
        with patch("main.execute_query") as mock_eq:
            response = test_client.post("/api/v1/usuarios/login", json={"Email": "user@example.com"})

        assert response.status_code == 400
        assert response.json["code"] == 400
        assert "Contrasena" in response.json["message"]
        mock_eq.assert_not_called()

    def test_get_usuarios_server_error_returns_500(self, test_client):
        with patch("main.execute_query", side_effect=Exception("DB error")):
            response = test_client.get("/api/v1/usuarios")

        assert response.status_code == 500
        assert response.json["code"] == 500
        assert "Error interno" in response.json["message"]


class TestUsuariosItem:
    def test_get_usuario_by_id_success(self, test_client):
        usuario = {"IDusuario": 1, "Email": "user@example.com", "Contrasena": "secret"}

        with patch("main.execute_query", return_value=usuario) as mock_eq:
            response = test_client.get("/api/v1/usuarios/1")

        assert response.status_code == 200
        assert response.json == {"IDusuario": 1, "Email": "user@example.com"}
        mock_eq.assert_called_once()

    def test_get_usuario_by_id_not_found(self, test_client):
        with patch("main.execute_query", return_value=None) as mock_eq:
            response = test_client.get("/api/v1/usuarios/999")

        assert response.status_code == 404
        assert response.json["code"] == 404
        mock_eq.assert_called_once()

    def test_put_usuario_success(self, test_client):
        updated_usuario = {"IDusuario": 1, "Email": "user@example.com"}

        with patch("main.execute_query", side_effect=[{"IDusuario": 1}, 1, updated_usuario]) as mock_eq:
            response = test_client.put(
                "/api/v1/usuarios/1",
                json={"Email": "updated@example.com"},
                headers=auth_headers(1),
            )

        assert response.status_code == 200
        assert response.json == updated_usuario
        assert mock_eq.call_count == 3

    def test_put_usuario_rechaza_contrasena_debil(self, test_client):
        with patch("main.execute_query", return_value={"IDusuario": 1}) as mock_eq:
            response = test_client.put(
                "/api/v1/usuarios/1",
                json={"Contrasena": "123"},
                headers=auth_headers(1),
            )

        assert response.status_code == 400
        assert "mínimo 8 caracteres" in response.json["message"]
        mock_eq.assert_called_once()

    def test_delete_usuario_success(self, test_client):
        with patch("main.execute_query", side_effect=[{"IDusuario": 1}, 1]) as mock_eq:
            response = test_client.delete("/api/v1/usuarios/1", headers=auth_headers(1))

        assert response.status_code == 204
        assert response.get_data(as_text=True) == ""
        assert mock_eq.call_count == 2

    def test_delete_usuario_not_found(self, test_client):
        with patch("main.execute_query", return_value=None) as mock_eq:
            response = test_client.delete("/api/v1/usuarios/999", headers=auth_headers(999))

        assert response.status_code == 404
        assert response.json["code"] == 404
        mock_eq.assert_called_once()


class TestUsuariosPrediosCollection:
    def test_get_usuarios_predios_success(self, test_client):
        predios = [{"IDusuario": 1, "IDpredio": 2, "Admin": True}]

        with patch("main.execute_query", return_value=predios) as mock_eq:
            response = test_client.get("/api/v1/usuarios-predios")

        assert response.status_code == 200
        assert response.json == predios
        mock_eq.assert_called_once()

    def test_post_usuarios_predios_success(self, test_client):
        created_relation = {"IDusuario": 1, "IDpredio": 2, "Admin": True}

        with patch("main.execute_query", side_effect=[{"Admin": True}, None, created_relation]) as mock_eq:
            response = test_client.post(
                "/api/v1/usuarios-predios",
                json={"IDusuario": 1, "IDpredio": 2, "Admin": True},
                headers=auth_headers(1),
            )

        assert response.status_code == 201
        assert response.json == created_relation
        assert mock_eq.call_count == 3

    def test_post_usuarios_predios_server_error_returns_500(self, test_client):
        with patch("main.execute_query", side_effect=Exception("DB error")):
            response = test_client.post(
                "/api/v1/usuarios-predios",
                json={"IDusuario": 1, "IDpredio": 2, "Admin": True},
                headers=auth_headers(1),
            )

        assert response.status_code == 500
        assert response.json["code"] == 500


class TestUsuariosPrediosItem:
    def test_get_usuario_predio_by_ids_success(self, test_client):
        relation = {"IDusuario": 1, "IDpredio": 2, "Admin": True}

        with patch("main.execute_query", return_value=relation) as mock_eq:
            response = test_client.get("/api/v1/usuarios-predios/1/2")

        assert response.status_code == 200
        assert response.json == relation
        mock_eq.assert_called_once()

    def test_get_usuario_predio_by_ids_not_found(self, test_client):
        with patch("main.execute_query", return_value=None) as mock_eq:
            response = test_client.get("/api/v1/usuarios-predios/1/99")

        assert response.status_code == 404
        assert response.json["code"] == 404
        mock_eq.assert_called_once()

    def test_put_usuario_predio_success(self, test_client):
        updated_relation = {"IDusuario": 1, "IDpredio": 2, "Admin": False}

        with patch("main.execute_query", side_effect=[{"Admin": True}, {"Admin": False}, 1, updated_relation]) as mock_eq:
            response = test_client.put(
                "/api/v1/usuarios-predios/1/2",
                json={"Admin": False},
                headers=auth_headers(1),
            )

        assert response.status_code == 200
        assert response.json == updated_relation
        assert mock_eq.call_count == 4

    def test_put_usuario_predio_rechaza_degradar_admin_a_lector(self, test_client):
        with patch("main.execute_query", side_effect=[{"Admin": True}, {"Admin": True}]) as mock_eq:
            response = test_client.put(
                "/api/v1/usuarios-predios/1/2",
                json={"Admin": False},
                headers=auth_headers(1),
            )

        assert response.status_code == 403
        assert response.json["code"] == 403
        assert "no puede convertirse en lector" in response.json["message"]
        assert mock_eq.call_count == 2

    def test_delete_usuario_predio_success(self, test_client):
        with patch("main.execute_query", side_effect=[{"Admin": True}, {"IDusuario": 1}, 1]) as mock_eq:
            response = test_client.delete("/api/v1/usuarios-predios/1/2", headers=auth_headers(1))

        assert response.status_code == 204
        assert response.get_data(as_text=True) == ""
        assert mock_eq.call_count == 3

    def test_delete_usuario_predio_not_found(self, test_client):
        with patch("main.execute_query", side_effect=[{"Admin": True}, None]) as mock_eq:
            response = test_client.delete("/api/v1/usuarios-predios/1/99", headers=auth_headers(1))

        assert response.status_code == 404
        assert response.json["code"] == 404
        assert mock_eq.call_count == 2


class TestSensoresItem:
    def test_get_sensor_by_id_success(self, test_client):
        sensor = {"IDsensor": 1, "Nombre": "Sensor A"}

        with patch("main.execute_query", return_value=sensor) as mock_eq:
            response = test_client.get("/api/v1/sensores/1")

        assert response.status_code == 200
        assert response.json == sensor
        mock_eq.assert_called_once()

    def test_get_sensor_by_id_not_found(self, test_client):
        with patch("main.execute_query", return_value=None) as mock_eq:
            response = test_client.get("/api/v1/sensores/999")

        assert response.status_code == 404
        assert response.json["code"] == 404
        mock_eq.assert_called_once()

    def test_put_sensor_success(self, test_client):
        updated_sensor = {"IDsensor": 1, "Nombre": "Sensor B"}

        with patch("main.execute_query", side_effect=[{"IDpredio": 2}, {"Admin": True}, 1, updated_sensor]) as mock_eq:
            response = test_client.put(
                "/api/v1/sensores/1",
                json={"Nombre": "Sensor B"},
                headers=auth_headers(1),
            )

        assert response.status_code == 200
        assert response.json == updated_sensor
        assert mock_eq.call_count == 4

    def test_post_sensor_success(self, test_client):
        new_sensor = {"IDsensor": 1, "Nombre": "Sensor A"}

        with patch("main.execute_query", side_effect=[{"IDpredio": 2}, {"Admin": True}, 1, new_sensor]) as mock_eq:
            response = test_client.post(
                "/api/v1/sensores",
                json={"Nombre": "Sensor A", "ID_Area": 3},
                headers=auth_headers(1),
            )

        assert response.status_code == 201
        assert response.json == new_sensor
        assert mock_eq.call_count == 4

    def test_unknown_route_returns_404(self, test_client):
        response = test_client.get("/api/v1/recurso-invalido")

        assert response.status_code == 404
        assert response.json["code"] == 404


class TestPrediosAccessControl:
    def test_get_predios_requiere_token(self, test_client):
        response = test_client.get("/api/v1/predios")
        assert response.status_code == 401

    def test_get_predios_retorna_solo_del_usuario(self, test_client):
        token = generar_token(7, "u@example.com", [])
        predios = [{"IDpredio": 1, "NombrePredio": "Rancho A"}]
        with patch("main.execute_query", return_value=predios):
            response = test_client.get(
                "/api/v1/predios",
                headers={"Authorization": f"Bearer {token}"},
            )

        assert response.status_code == 200
        assert response.json == predios
