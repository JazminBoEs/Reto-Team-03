-- ============================================================
--  IrriGo — Script de base de datos MySQL (Versión 2.0)
-- ============================================================

DROP DATABASE IF EXISTS IrriGo;
CREATE DATABASE IrriGo
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE IrriGo;

-- ------------------------------------------------------------
-- Tabla: Usuario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Usuario (
    IDusuario    INT            AUTO_INCREMENT PRIMARY KEY,
    Nombre       VARCHAR(100)   NOT NULL,
    Apellido     VARCHAR(100),
    Email        VARCHAR(150)   NOT NULL,
    Contrasena   VARCHAR(255)   NOT NULL,
    Telefono     VARCHAR(20)
    -- Nota: Email NO es UNIQUE globalmente porque un mismo usuario
    -- puede registrar múltiples cuentas para distintos predios.
    -- La unicidad se garantiza a nivel Email+IDpredio vía Usuario_predio.
);

-- ------------------------------------------------------------
-- Tabla: Predio
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Predio (
    IDpredio      INT          AUTO_INCREMENT PRIMARY KEY,
    CodigoAcceso  VARCHAR(8)   NOT NULL UNIQUE,   -- Código que el Admin comparte con Lectores
    NombrePredio  VARCHAR(100) NOT NULL,
    Ubicacion     VARCHAR(255),
    Latitud       DECIMAL(10, 8),
    Longitud      DECIMAL(11, 8),
    FechaCreacion DATETIME     DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Tabla: Usuario_predio (Relación M:N extendida con roles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Usuario_predio (
    IDusuario        INT          NOT NULL,
    IDpredio         INT          NOT NULL,
    Admin            BOOLEAN      DEFAULT FALSE,                    -- Legacy, usar Rol
    Rol              ENUM('admin','lector') DEFAULT 'lector',       -- Rol principal
    Alcance          ENUM('todo','uno') DEFAULT 'todo',             -- Visibilidad
    Area_Permitida   INT          DEFAULT NULL,                     -- FK a AreaRiego (para Alcance='uno')
    Fecha_Expiracion DATETIME     DEFAULT NULL,                     -- NULL = sin expiración
    Activo           BOOLEAN      DEFAULT TRUE,
    Fecha_Asignacion DATETIME     DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (IDusuario, IDpredio),
    FOREIGN KEY (IDusuario) REFERENCES Usuario(IDusuario) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (IDpredio)  REFERENCES Predio(IDpredio)   ON UPDATE CASCADE ON DELETE RESTRICT
    -- FK a Area_Permitida se agrega después de crear AreaRiego
);

-- ------------------------------------------------------------
-- Tabla: ModuloControl
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ModuloControl (
    ID_Modulo            INT          AUTO_INCREMENT PRIMARY KEY,
    Nombre               VARCHAR(100),
    IdentificadorRed     VARCHAR(100),
    Estado               BOOLEAN      DEFAULT TRUE,
    UltimaConexion       DATETIME,
    Ultima_Actualizacion DATETIME
);

-- ------------------------------------------------------------
-- Tabla: AreaRiego
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS AreaRiego (
    ID_Area       INT           AUTO_INCREMENT PRIMARY KEY,
    IDpredio      INT           NOT NULL,
    ID_Modulo     INT,
    Nombre        VARCHAR(100),
    Num_Hectareas FLOAT,
    Estado        BOOLEAN       DEFAULT TRUE,
    FOREIGN KEY (IDpredio)  REFERENCES Predio(IDpredio)   ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (ID_Modulo) REFERENCES ModuloControl(ID_Modulo) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Agregar FK de Area_Permitida ahora que AreaRiego existe
ALTER TABLE Usuario_predio
    ADD CONSTRAINT fk_area_permitida
    FOREIGN KEY (Area_Permitida) REFERENCES AreaRiego(ID_Area) ON DELETE SET NULL;

-- ------------------------------------------------------------
-- Tabla: Sensor
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Sensor (
    IDsensor  INT   AUTO_INCREMENT PRIMARY KEY,
    ID_Modulo INT,
    ID_Area   INT,
    Latitud   DECIMAL(10, 8),
    Longitud  DECIMAL(11, 8),
    Bateria   FLOAT,
    Senal     FLOAT,
    FOREIGN KEY (ID_Modulo) REFERENCES ModuloControl(ID_Modulo) ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (ID_Area)   REFERENCES AreaRiego(ID_Area)       ON UPDATE CASCADE ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- Tabla: ConfiguracionCultivo (Relación 1:1 con AreaRiego)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ConfiguracionCultivo (
    ID_Configuracion  INT           AUTO_INCREMENT PRIMARY KEY,
    ID_Area           INT           NOT NULL UNIQUE,
    TipoCultivo       VARCHAR(100),
    TipoTierra        VARCHAR(100),
    CapacidadCampo    FLOAT,
    PuntoMarchitez    FLOAT,
    RangoHumedadMIN   FLOAT,
    RangoHumedadMAX   FLOAT,
    LaminaRiego       FLOAT,
    FOREIGN KEY (ID_Area) REFERENCES AreaRiego(ID_Area) ON UPDATE CASCADE ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Tabla: MedicionHistorica
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS MedicionHistorica (
    ID_Medicion           INT      AUTO_INCREMENT PRIMARY KEY,
    ID_Area               INT      NOT NULL,
    Fecha                 DATETIME DEFAULT CURRENT_TIMESTAMP,
    Temperatura_Suelo     FLOAT,
    Humedad_suelo         FLOAT,
    Evapotranspiracion    FLOAT,
    Conductividad_suelo   FLOAT,
    consumo_agua          FLOAT,
    Desarrollo_vegetativa FLOAT,
    Potencial_Hidrico     FLOAT,
    Temp_Ambiental        INT,
    Humedad_Relativa      FLOAT,
    Velocidad_Viento      FLOAT,
    Radiacion_Sol         FLOAT,
    Consumo_Diario_Prom   FLOAT,
    Consumo_Acum          FLOAT,
    FOREIGN KEY (ID_Area) REFERENCES AreaRiego(ID_Area) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- Tabla: Alerta
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Alerta (
    ID_Alerta        INT          AUTO_INCREMENT PRIMARY KEY,
    ID_area          INT          NOT NULL,
    IDusuario        INT,
    Fecha            DATETIME     DEFAULT CURRENT_TIMESTAMP,
    Tipo             VARCHAR(100),
    Severidad        VARCHAR(50),
    Mensaje          TEXT         DEFAULT NULL,   -- Descripción dinámica del evento
    Leida            BOOLEAN      DEFAULT FALSE,
    Confirmada_Admin BOOLEAN      DEFAULT FALSE,
    FOREIGN KEY (ID_area)   REFERENCES AreaRiego(ID_Area)   ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (IDusuario) REFERENCES Usuario(IDusuario)     ON UPDATE CASCADE ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- Tabla: RegistroAuditoria
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS RegistroAuditoria (
    IDregistro          INT      AUTO_INCREMENT PRIMARY KEY,
    IDusuario           INT,
    ID_Area             INT,
    Fecha_Modificacion  DATETIME DEFAULT CURRENT_TIMESTAMP,
    Dato_Modificado     TEXT,
    FOREIGN KEY (IDusuario) REFERENCES Usuario(IDusuario)   ON UPDATE CASCADE ON DELETE SET NULL,
    FOREIGN KEY (ID_Area)   REFERENCES AreaRiego(ID_Area)   ON UPDATE CASCADE ON DELETE SET NULL
);

-- ============================================================
-- DATOS SEMILLA
-- ============================================================

-- Usuarios
INSERT INTO Usuario (Nombre, Apellido, Email, Contrasena, Telefono)
VALUES 
    ('Admin', 'IrriGo', 'admin@irrigo.com', 'scrypt:32768:8:1$YGjBhMOAfbT2idBb$00b235f54042df48a33a456b10dc88d7daf3758fcdc745bbd63a3b1f93d60724ae0972c6b3dadc2f6b13ff15e23acc8b478bae8c1bf01ab9dd564dcaaf62bb30', '1234567890'),
    ('Jazmin', 'BoEs', 'jazmin@example.com', 'scrypt:32768:8:1$q9YECUWDXfK6bCS7$3255d90f1dc49e5cd6ff432249a4baecdf01b92907be6bc679d11bbf98c17a7507c5491cc0408b068d864bdf1bff6fec735c376499ab83af3d2ec2a295770982', '0987654321');

-- Predio (con CodigoAcceso inicial)
INSERT INTO Predio (CodigoAcceso, NombrePredio, Ubicacion, Latitud, Longitud)
VALUES ('RE2026AB', 'Rancho La Esperanza', 'Chihuahua, Chih.', 28.632996, -106.069100);

-- Relaciones Usuario-Predio con Rol explícito
INSERT INTO Usuario_predio (IDusuario, IDpredio, Admin, Rol, Alcance)
VALUES 
    (1, 1, 1, 'admin', 'todo'),
    (2, 1, 0, 'lector', 'todo');

-- Módulo de control
INSERT INTO ModuloControl (Nombre, IdentificadorRed, Estado)
VALUES ('Módulo Central Norte', 'MAC-10:22:33', TRUE);

-- Área de riego
INSERT INTO AreaRiego (IDpredio, ID_Modulo, Nombre, Num_Hectareas, Estado)
VALUES (1, 1, 'Parcela Norte', 3.5, TRUE);

-- Actualizar lector con Area_Permitida (Parcela Norte = ID 1)
UPDATE Usuario_predio SET Area_Permitida = 1, Alcance = 'uno' WHERE IDusuario = 2 AND IDpredio = 1;

-- Sensor
INSERT INTO Sensor (ID_Modulo, ID_Area, Latitud, Longitud, Bateria, Senal)
VALUES (1, 1, 28.633000, -106.069200, 87.5, 75.3);

-- Configuración de cultivo
INSERT INTO ConfiguracionCultivo (
    ID_Area, TipoCultivo, TipoTierra,
    CapacidadCampo, PuntoMarchitez,
    RangoHumedadMIN, RangoHumedadMAX,
    LaminaRiego
)
VALUES (
    1, 'Nogal', 'Arcillosa',
    35.5, 12.2,
    15.0, 30.0,
    5.5
);

-- Medición histórica inicial
INSERT INTO MedicionHistorica (
    ID_Area,
    Temperatura_Suelo, Humedad_suelo, Evapotranspiracion,
    Conductividad_suelo, consumo_agua, Desarrollo_vegetativa,
    Potencial_Hidrico, Temp_Ambiental, Humedad_Relativa,
    Velocidad_Viento, Radiacion_Sol, Consumo_Diario_Prom, Consumo_Acum
)
VALUES (
    1,
    24.5, 18.2, 3.1,
    1.2, 120.5, 0.75,
    -1.5, 28, 45.2,
    12.3, 500.0, 110.2, 1200.8
);

-- Alerta con mensaje descriptivo
INSERT INTO Alerta (ID_area, IDusuario, Tipo, Severidad, Mensaje)
VALUES (1, 2, 'Baja humedad', 'Alta', 'Humedad en Parcela Norte: 18.2% — cerca del mínimo de 15%');

-- Auditoría
INSERT INTO RegistroAuditoria (IDusuario, ID_Area, Dato_Modificado)
VALUES (1, 1, 'Actualización de parámetros de cultivo');

-- ============================================================
-- El post periódico de mediciones se realiza desde main.py
-- (_periodic_medicion_loop cada 10 minutos)
-- ============================================================
