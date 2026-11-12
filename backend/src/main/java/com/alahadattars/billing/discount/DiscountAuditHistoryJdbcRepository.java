package com.alahadattars.billing.discount;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;

/** Read-only access to historical approval audit events retained from the original V5 model. */
@Repository
public class DiscountAuditHistoryJdbcRepository {
    private final JdbcTemplate jdbcTemplate;

    public DiscountAuditHistoryJdbcRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<DiscountAuditEventView> findEvents(long requestId) {
        if (requestId <= 0) {
            throw new IllegalArgumentException("discount request ID must be positive");
        }
        return jdbcTemplate.query("""
                SELECT e.id, e.actor_user_id, u.email AS actor_email, e.action, e.reason,
                       e.event_data, e.created_at
                FROM billing_discount_audit_event e
                JOIN users u ON u.id = e.actor_user_id
                WHERE e.discount_request_id = ?
                ORDER BY e.created_at, e.id
                """, (rs, rowNum) -> mapEvent(rs), requestId);
    }

    private static DiscountAuditEventView mapEvent(ResultSet rs) throws SQLException {
        return new DiscountAuditEventView(
                rs.getLong("id"), rs.getLong("actor_user_id"), rs.getString("actor_email"),
                rs.getString("action"), rs.getString("reason"), rs.getString("event_data"),
                rs.getTimestamp("created_at").toInstant());
    }
}
