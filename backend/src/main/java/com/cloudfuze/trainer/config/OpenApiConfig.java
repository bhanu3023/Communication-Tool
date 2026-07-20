package com.cloudfuze.trainer.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    private static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI trainerOpenAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("AI Communication Skills Trainer API")
                        .description("Listening, Speaking and Writing assessment platform for CloudFuze")
                        .version("1.0.0")
                        .contact(new Contact().name("CloudFuze").email("engineering@cloudfuze.com")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER))
                .components(new Components().addSecuritySchemes(BEARER,
                        new SecurityScheme()
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("Application JWT issued by POST /api/auth/login")));
    }
}
