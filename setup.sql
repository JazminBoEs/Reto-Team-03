-- 1. Crear la base de datos IrriGo si no existe (Versión MySQL)
CREATE DATABASE IF NOT EXISTS IrriGo;

-- Usar la base de datos
USE IrriGo;

-- 2. CREACIÓN DE TABLAS (Traducidas a MySQL)

-- Tabla Usuario
CREATE TABLE IF NOT EXISTS Usuario (
    IDusuario INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(100) NOT NULL,
    Apellido VARCHAR(100),
    Email VARCHAR(150) UNIQUE NOT NULL,
    Contraseña VARCHAR(255) NOT NULL,
    Teléfono VARCHAR(20)
);

-- Tabla Predio
CREATE TABLE IF NOT EXISTS Predio (
    IDpredio INT AUTO_INCREMENT PRIMARY KEY,
    NombrePredio VARCHAR(100) NOT NULL,
    Ubicación VARCHAR(255),
    FechaCreación DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla Usuario_predio
CREATE TABLE IF NOT EXISTS Usuario_predio (
    IDusuario INT,
    IDpredio INT,
    Rol VARCHAR(50) NOT NULL,
    Fecha_Asignacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (IDusuario, IDpredio),
    FOREIGN KEY (IDusuario) REFERENCES Usuario(IDusuario),
    FOREIGN KEY (IDpredio) REFERENCES Predio(IDpredio)
);

-- Tabla RegistroAuditoria
CREATE TABLE IF NOT EXISTS RegistroAuditoria (
    IDregistro INT AUTO_INCREMENT PRIMARY KEY,
    IDusuario INT,
    ID_Area INT,
    Fecha_Modificacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    Dato_Modificado TEXT,
    FOREIGN KEY (IDusuario) REFERENCES Usuario(IDusuario)
);

-- Tabla ModuloControl
CREATE TABLE IF NOT EXISTS ModuloControl (
    ID_Modulo INT AUTO_INCREMENT PRIMARY KEY,
    Nombre VARCHAR(100),
    IdentificadorRed VARCHAR(100),
    Estado BOOLEAN DEFAULT 1,
    UltimaConexion DATETIME,
    Ultima_Actualizacion DATETIME
);

-- Tabla AreaRiego
CREATE TABLE IF NOT EXISTS AreaRiego (
    ID_Area INT AUTO_INCREMENT PRIMARY KEY,
    IDpredio INT,
    ID_Modulo INT,
    Nombre VARCHAR(100),
    Num_Hectareas FLOAT,
    Estado BOOLEAN DEFAULT 1,
    FOREIGN KEY (IDpredio) REFERENCES Predio(IDpredio),
    FOREIGN KEY (ID_Modulo) REFERENCES ModuloControl(ID_Modulo)
);

-- Tabla Sensor 
CREATE TABLE IF NOT EXISTS Sensor (
    IDsensor INT AUTO_INCREMENT PRIMARY KEY,
    ID_Modulo INT,
    ID_Area INT,
    Bateria FLOAT,
    Señal FLOAT,
    FOREIGN KEY (ID_Modulo) REFERENCES ModuloControl(ID_Modulo),
    FOREIGN KEY (ID_Area) REFERENCES AreaRiego(ID_Area)
);

-- Tabla ConfiguracionCultivo
CREATE TABLE IF NOT EXISTS ConfiguracionCultivo (
    ID_Configuracion INT AUTO_INCREMENT PRIMARY KEY,
    ID_Area INT UNIQUE, 
    TipoCultivo VARCHAR(100),
    TipoTierra VARCHAR(100),
    CapacidadCampo FLOAT,
    PuntoMarchitez FLOAT,
    RangoHumedadMIN FLOAT,
    RangoHumedadMAX FLOAT,
    LaminaRiego FLOAT,
    DesarrolloVegetativo FLOAT,
    FOREIGN KEY (ID_Area) REFERENCES AreaRiego(ID_Area)
);

-- Tabla Alerta
CREATE TABLE IF NOT EXISTS Alerta (
    ID_Alerta INT AUTO_INCREMENT PRIMARY KEY,
    ID_area INT,
    IDusuario INT,
    Fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    Tipo VARCHAR(100),
    Severidad VARCHAR(50),
    Estado BOOLEAN DEFAULT 0,
    Leida BOOLEAN DEFAULT 0,
    FOREIGN KEY (ID_area) REFERENCES AreaRiego(ID_Area),
    FOREIGN KEY (IDusuario) REFERENCES Usuario(IDusuario)
);

-- Tabla MedicionHistorica
CREATE TABLE IF NOT EXISTS MedicionHistorica (
    ID_Medicion INT AUTO_INCREMENT PRIMARY KEY,
    ID_Area INT,
    Fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
    Temperatura_Suelo FLOAT,
    Humedad_suelo FLOAT,
    Evapotranspiracion FLOAT,
    Conductividad_suelo FLOAT, 
    consumo_agua FLOAT,
    Desarrollo_vegetativa FLOAT,
    FOREIGN KEY (ID_Area) REFERENCES AreaRiego(ID_Area)
);

-- ==========================================
-- 3. DATOS SEMILLA PARA TU PRESENTACIÓN (MVP)
-- ==========================================
INSERT INTO Predio (NombrePredio, Ubicación) VALUES ('Rancho La Esperanza', 'Chihuahua, Chih.');

INSERT INTO ModuloControl (Nombre, IdentificadorRed) VALUES ('Módulo Central Norte', 'MAC-10:22:33');

INSERT INTO AreaRiego (IDpredio, ID_Modulo, Nombre, Num_Hectareas, Estado) VALUES 
(1, 1, 'Parcela Norte', 3.5, 1),
(1, 1, 'Parcela Sur', 2.0, 1),
(1, 1, 'Parcela Este', 4.1, 1),
(1, 1, 'Parcela Oeste', 1.8, 0);