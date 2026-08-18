package com.alahadattars.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.ToString;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity
@Table(name = "cms_page")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@ToString
public class CmsPage {

    @Id
    @Column(name = "page_key", length = 100, nullable = false)
    private String pageKey;

    @Column(columnDefinition = "TEXT")
    private String contentJson;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
