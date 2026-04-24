from unittest.mock import patch


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
            )

        assert response.status_code == 200
        assert response.json == updated_usuario
        assert mock_eq.call_count == 3

    def test_delete_usuario_success(self, test_client):
        with patch("main.execute_query", side_effect=[{"IDusuario": 1}, 1]) as mock_eq:
            response = test_client.delete("/api/v1/usuarios/1")

        assert response.status_code == 204
        assert response.get_data(as_text=True) == ""
        assert mock_eq.call_count == 2

    def test_delete_usuario_not_found(self, test_client):
        with patch("main.execute_query", return_value=None) as mock_eq:
            response = test_client.delete("/api/v1/usuarios/999")

        assert response.status_code == 404
        assert response.json["code"] == 404
        mock_eq.assert_called_once()


class TestUsuariosPrediosCollection:
    def test_get_usuarios_predios_success(self, test_client):
        predios = [{"IDusuario": 1, "IDpredio": 2, "Rol": "admin"}]

        with patch("main.execute_query", return_value=predios) as mock_eq:
            response = test_client.get("/api/v1/usuarios-predios")

        assert response.status_code == 200
        assert response.json == predios
        mock_eq.assert_called_once()

    def test_post_usuarios_predios_success(self, test_client):
        created_relation = {"IDusuario": 1, "IDpredio": 2, "Rol": "admin"}

        with patch("main.execute_query", side_effect=[None, created_relation]) as mock_eq:
            response = test_client.post(
                "/api/v1/usuarios-predios",
                json={"IDusuario": 1, "IDpredio": 2, "Rol": "admin"},
            )

        assert response.status_code == 201
        assert response.json == created_relation
        assert mock_eq.call_count == 2

    def test_post_usuarios_predios_server_error_returns_500(self, test_client):
        with patch("main.execute_query", side_effect=Exception("DB error")):
            response = test_client.post(
                "/api/v1/usuarios-predios",
                json={"IDusuario": 1, "IDpredio": 2, "Rol": "admin"},
            )

        assert response.status_code == 500
        assert response.json["code"] == 500


class TestUsuariosPrediosItem:
    def test_get_usuario_predio_by_ids_success(self, test_client):
        relation = {"IDusuario": 1, "IDpredio": 2, "Rol": "admin"}

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
        updated_relation = {"IDusuario": 1, "IDpredio": 2, "Rol": "owner"}

        with patch("main.execute_query", side_effect=[{"IDusuario": 1}, 1, updated_relation]) as mock_eq:
            response = test_client.put(
                "/api/v1/usuarios-predios/1/2",
                json={"Rol": "owner"},
            )

        assert response.status_code == 200
        assert response.json == updated_relation
        assert mock_eq.call_count == 3

    def test_delete_usuario_predio_success(self, test_client):
        with patch("main.execute_query", side_effect=[{"IDusuario": 1}, 1]) as mock_eq:
            response = test_client.delete("/api/v1/usuarios-predios/1/2")

        assert response.status_code == 204
        assert response.get_data(as_text=True) == ""
        assert mock_eq.call_count == 2

    def test_delete_usuario_predio_not_found(self, test_client):
        with patch("main.execute_query", return_value=None) as mock_eq:
            response = test_client.delete("/api/v1/usuarios-predios/1/99")

        assert response.status_code == 404
        assert response.json["code"] == 404
        mock_eq.assert_called_once()


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

        with patch("main.execute_query", side_effect=[{"IDsensor": 1}, 1, updated_sensor]) as mock_eq:
            response = test_client.put(
                "/api/v1/sensores/1",
                json={"Nombre": "Sensor B"},
            )

        assert response.status_code == 200
        assert response.json == updated_sensor
        assert mock_eq.call_count == 3

    def test_post_sensor_success(self, test_client):
        new_sensor = {"IDsensor": 1, "Nombre": "Sensor A"}

        with patch("main.execute_query", side_effect=[1, new_sensor]) as mock_eq:
            response = test_client.post(
                "/api/v1/sensores",
                json={"Nombre": "Sensor A"},
            )

        assert response.status_code == 201
        assert response.json == new_sensor
        assert mock_eq.call_count == 2

    def test_unknown_route_returns_404(self, test_client):
        response = test_client.get("/api/v1/recurso-invalido")

        assert response.status_code == 404
        assert response.json["code"] == 404
