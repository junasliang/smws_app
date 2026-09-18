package config

import "os"

type Config struct {
	Port   string
	DBPath string
}

func Load() Config {
	return Config{
		Port:   getEnv("PORT", "8088"),
		DBPath: getEnv("DB_PATH", "./data/smws.db"),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
