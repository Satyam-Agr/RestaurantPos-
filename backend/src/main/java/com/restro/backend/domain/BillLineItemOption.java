package com.restro.backend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

// A snapshot taken at bill-generation time from OrderItemSelectedOption, which is hard-deleted along
// with the order once the bill is generated — this is what survives for upsell/revenue analytics.
@Entity
@Table(name = "bill_line_item_option")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillLineItemOption {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bill_line_item_id", nullable = false)
    private BillLineItem billLineItem;

    @Column(name = "option_name", nullable = false)
    private String optionName;

    @Column(name = "price_delta", nullable = false, precision = 10, scale = 2)
    private BigDecimal priceDelta;
}
