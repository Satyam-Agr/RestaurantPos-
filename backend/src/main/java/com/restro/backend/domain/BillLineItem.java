package com.restro.backend.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bill_line_item")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BillLineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "bill_id", nullable = false)
    private Bill bill;

    @Column(name = "menu_item_name", nullable = false)
    private String menuItemName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(name = "unit_price", nullable = false, precision = 10, scale = 2)
    private BigDecimal unitPrice;

    @Column(name = "line_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal lineTotal;

    // Flat display string, e.g. "Large, Extra Cheese" — built at generate time from the order item's selections.
    @Column(name = "customization_summary")
    private String customizationSummary;

    // Snapshot of the menu item's dietary tag at generate time — MenuItem.dietaryType can change later,
    // and this must stay a permanent historical record for analytics (see BillLineItemOption for why).
    @Enumerated(EnumType.STRING)
    @Column(name = "dietary_type")
    private DietaryType dietaryType;

    @OneToMany(mappedBy = "billLineItem", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<BillLineItemOption> options = new ArrayList<>();
}
