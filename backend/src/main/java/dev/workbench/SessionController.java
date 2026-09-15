package dev.workbench;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.security.Principal;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.ReactiveAuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.server.context.WebSessionServerSecurityContextRepository;
import org.springframework.security.web.server.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping("/api")
public class SessionController {
    private final AccountRepository accounts;
    private final ReactiveAuthenticationManager authentication;
    private final WebSessionServerSecurityContextRepository contexts;

    public SessionController(
            AccountRepository accounts,
            ReactiveAuthenticationManager authentication,
            WebSessionServerSecurityContextRepository contexts) {
        this.accounts = accounts;
        this.authentication = authentication;
        this.contexts = contexts;
    }

    public record Login(
            @NotBlank @Size(max = 80) String username,
            @NotBlank @Size(max = 200) String password) {}

    public record SessionResponse(Account.View user) {}

    @GetMapping("/session")
    Mono<SessionResponse> session(Mono<Principal> principal) {
        return principal
                .flatMap(p -> accounts.findByUsername(p.getName()))
                .map(account -> new SessionResponse(account.view()))
                .defaultIfEmpty(new SessionResponse(null));
    }

    @GetMapping("/csrf")
    Mono<Map<String, String>> csrf(ServerWebExchange exchange) {
        Mono<CsrfToken> token = exchange.getAttribute(CsrfToken.class.getName());
        return token.map(t -> Map.of("token", t.getToken(), "headerName", t.getHeaderName()));
    }

    @PostMapping("/session")
    Mono<SessionResponse> login(@Valid @RequestBody Login input, ServerWebExchange exchange) {
        return authentication
                .authenticate(UsernamePasswordAuthenticationToken.unauthenticated(
                        input.username().strip(), input.password()))
                .flatMap(auth -> contexts.save(exchange, new SecurityContextImpl(auth))
                        .then(accounts.findByUsername(auth.getName()))
                        .map(account -> new SessionResponse(account.view())))
                .onErrorMap(
                        AuthenticationException.class,
                        error -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "账号或密码不正确"));
    }

    @DeleteMapping("/session")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    Mono<Void> logout(ServerWebExchange exchange) {
        return exchange.getSession().flatMap(session -> session.invalidate());
    }
}
