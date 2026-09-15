package dev.workbench;

import java.util.HashMap;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.UserDetailsRepositoryReactiveAuthenticationManager;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.core.userdetails.ReactiveUserDetailsService;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.context.WebSessionServerSecurityContextRepository;
import org.springframework.security.web.server.csrf.CookieServerCsrfTokenRepository;
import org.springframework.security.web.server.csrf.ServerCsrfTokenRequestAttributeHandler;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;
import reactor.core.scheduler.Schedulers;

@Configuration
public class SecurityConfiguration {
    /** Adapted from Halo v2.26.1 WebServerSecurityConfig.passwordEncoder(), GPL-3.0. */
    @Bean
    PasswordEncoder passwordEncoder() {
        var encodingId = "argon2@SpringSecurity_v5_8";
        var encoders = new HashMap<String, PasswordEncoder>();
        encoders.put(encodingId, Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8());
        return new DelegatingPasswordEncoder(encodingId, encoders);
    }

    @Bean
    ReactiveUserDetailsService users(AccountRepository accounts) {
        return username -> accounts.findByUsername(username)
                .map(account -> User.withUsername(account.username())
                        .password(account.passwordHash())
                        .roles(account.roles().toArray(String[]::new))
                        .build());
    }

    @Bean
    ReactiveAuthenticationManager authenticationManager(ReactiveUserDetailsService users, PasswordEncoder encoder) {
        var manager = new UserDetailsRepositoryReactiveAuthenticationManager(users);
        manager.setPasswordEncoder(encoder);
        manager.setScheduler(Schedulers.boundedElastic());
        return manager;
    }

    @Bean
    WebSessionServerSecurityContextRepository contexts() {
        return new WebSessionServerSecurityContextRepository();
    }

    @Bean
    SecurityWebFilterChain security(ServerHttpSecurity http, WebSessionServerSecurityContextRepository contexts) {
        return http.securityContextRepository(contexts)
                .csrf(csrf -> csrf.csrfTokenRepository(CookieServerCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(new ServerCsrfTokenRequestAttributeHandler()))
                .authorizeExchange(auth -> auth.pathMatchers(
                                HttpMethod.GET, "/api/health", "/api/csrf", "/api/session", "/api/public/**")
                        .permitAll()
                        .pathMatchers(HttpMethod.POST, "/api/session")
                        .permitAll()
                        .pathMatchers("/api/**")
                        .authenticated()
                        .anyExchange()
                        .permitAll())
                .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
                .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
                .logout(ServerHttpSecurity.LogoutSpec::disable)
                .exceptionHandling(errors -> errors.authenticationEntryPoint(
                                (exchange, error) -> error(exchange, HttpStatus.UNAUTHORIZED, "请先登录"))
                        .accessDeniedHandler(
                                (exchange, error) -> error(exchange, HttpStatus.FORBIDDEN, "请求无权执行或安全校验失败")))
                .build();
    }

    private Mono<Void> error(ServerWebExchange exchange, HttpStatus status, String message) {
        var response = exchange.getResponse();
        response.setStatusCode(status);
        response.getHeaders().setContentType(MediaType.APPLICATION_JSON);
        return response.writeWith(Mono.just(response.bufferFactory()
                .wrap(("{\"message\":\"" + message + "\"}").getBytes(java.nio.charset.StandardCharsets.UTF_8))));
    }
}
