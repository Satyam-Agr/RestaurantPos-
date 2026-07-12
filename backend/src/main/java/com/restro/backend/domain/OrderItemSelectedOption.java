package com.restro.backend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// A snapshot, not a live FK to CustomizationOption — admin editing/deleting an option later must
// never rewrite the history of an order that already selected it (same reasoning as OrderItem.unitPrice).
@Entity
@Table(name = "order_item_selected_option")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItemSelectedOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_item_id", nullable = false)
    private OrderItem orderItem;

    @Column(name = "group_name", nullable = false)
    private String groupName;

    @Column(name = "option_name", nullable = false)
    private String optionName;

    @Column(name = "price_delta", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceDelta;
}
