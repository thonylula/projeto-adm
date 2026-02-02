import React from 'react';
import type { InvoiceData, ItemAllocationConfig } from '../types';

interface PantryListProps {
    items: any[];
    employees: { name: string; isNonDrinker: boolean; message?: string }[];
    motivationalMessages?: string[];
    sloganImage?: string | null;
    companyName: string;
    recipientCnpj?: string;
    companyLogo?: string | null;
    itemAllocation?: Record<string, ItemAllocationConfig>;
    appMode?: 'BASIC' | 'CHRISTMAS' | null;
}

export const PantryList: React.FC<PantryListProps> = ({
    items,
    employees,
    motivationalMessages = [],
    companyName,
    recipientCnpj,
    companyLogo,
    sloganImage,
    itemAllocation = {},
    appMode = 'BASIC'
}) => {
    const formatQty = (qty: number) => qty.toLocaleString('pt-BR', { minimumFractionDigits: 3 });
    const orange = '#f97316';
    const darkBlue = '#1e293b';
    const lightGray = '#f8fafc';

    const totalEmployees = (employees || []).length;
    const nonDrinkerCount = (employees || []).filter(e => e.isNonDrinker).length;
    const drinkerCount = totalEmployees - nonDrinkerCount;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {(employees || []).map((emp, index) => {
                const { name, isNonDrinker } = emp;

                // Filter items based on allocation
                const visibleItems = (items || []).filter(item => {
                    const config = (itemAllocation || {})[item.id] || { mode: 'ALL' };
                    if (config.mode === 'ALL' || config.mode === 'CUSTOM') return true;
                    if (isNonDrinker && config.mode === 'NON_DRINKER') return true;
                    if (!isNonDrinker && config.mode === 'DRINKER') return true;
                    return false;
                });

                return (
                    <div
                        key={index}
                        style={{
                            backgroundColor: '#ffffff',
                            border: `2px solid ${orange}`,
                            fontFamily: 'system-ui, -apple-system, sans-serif',
                            color: '#444',
                            position: 'relative',
                            display: 'flex',
                            flexDirection: 'column',
                            WebkitPrintColorAdjust: 'exact',
                            printColorAdjust: 'exact',
                            pageBreakInside: 'avoid'
                        } as React.CSSProperties}
                    >
                        {/* Header with Logo */}
                        <div style={{
                            padding: '12px 16px',
                            borderBottom: `1px solid ${orange}`,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: '#ffffff'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {companyLogo && (
                                    <img
                                        src={companyLogo}
                                        alt="Logo"
                                        style={{
                                            height: '40px',
                                            width: 'auto',
                                            objectFit: 'contain'
                                        }}
                                    />
                                )}
                                <div>
                                    <h1 style={{
                                        fontSize: '16px',
                                        fontWeight: 900,
                                        textTransform: 'uppercase',
                                        color: darkBlue,
                                        margin: 0,
                                        lineHeight: 1.2
                                    }}>
                                        {companyName}
                                    </h1>
                                    <p style={{
                                        fontSize: '10px',
                                        color: '#64748b',
                                        fontWeight: 700,
                                        margin: '2px 0 0 0'
                                    }}>
                                        CNPJ: {recipientCnpj || '---'}
                                    </p>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                {/* Basket Type Badge */}
                                <div style={{
                                    backgroundColor: orange,
                                    color: '#ffffff',
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    fontSize: '9px',
                                    fontWeight: 900,
                                    textTransform: 'uppercase',
                                    marginBottom: '4px'
                                }}>
                                    {isNonDrinker ? '🥤 CESTA ESPECIAL' : '🍺 CESTA PADRÃO'}
                                </div>
                                <p style={{
                                    fontSize: '11px',
                                    fontWeight: 800,
                                    color: darkBlue,
                                    margin: 0
                                }}>
                                    Data: {new Date().toLocaleDateString('pt-BR')}
                                </p>
                            </div>
                        </div>

                        {/* Orange Divider */}
                        <div style={{
                            height: '4px',
                            width: '100%',
                            backgroundColor: orange
                        }} />

                        {/* Motivational Message */}
                        <div style={{
                            padding: '10px 16px',
                            textAlign: 'center',
                            backgroundColor: '#ffffff'
                        }}>
                            <p style={{
                                color: '#4f46e5',
                                fontWeight: 800,
                                fontStyle: 'italic',
                                fontSize: '11px',
                                lineHeight: 1.4,
                                margin: 0
                            }}>
                                "{(emp as any).message || "Sua dedicação é a força que impulsiona nosso sucesso. Obrigado!"}"
                            </p>
                        </div>

                        {/* Items Table */}
                        <div style={{ flex: 1, padding: '0 16px 16px 16px' }}>
                            {/* Table Header */}
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                padding: '8px 0',
                                borderBottom: `1px solid ${orange}`,
                                marginBottom: '4px'
                            }}>
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase'
                                }}>
                                    Descrição do Produto
                                </span>
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: '#64748b',
                                    textTransform: 'uppercase'
                                }}>
                                    Quantidade
                                </span>
                            </div>

                            {/* Table Body */}
                            {(visibleItems || []).map((item, idx) => {
                                const config = (itemAllocation || {})[item.id] || { mode: 'ALL' };
                                let qtyPerEmployee = 0;

                                if (config.mode === 'CUSTOM') {
                                    qtyPerEmployee = isNonDrinker
                                        ? (config.customQtyNonDrinker || 0)
                                        : (config.customQtyDrinker || 0);
                                } else if (config.mode === 'ALL') {
                                    qtyPerEmployee = (item.quantity || 0) / (totalEmployees || 1);
                                } else if (config.mode === 'NON_DRINKER' && isNonDrinker) {
                                    qtyPerEmployee = (item.quantity || 0) / (nonDrinkerCount || 1);
                                } else if (config.mode === 'DRINKER' && !isNonDrinker) {
                                    qtyPerEmployee = (item.quantity || 0) / (drinkerCount || 1);
                                }

                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            padding: '6px 0',
                                            borderBottom: '1px solid #fed7aa'
                                        }}
                                    >
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: darkBlue,
                                            textTransform: 'uppercase'
                                        }}>
                                            {item.description}
                                        </span>
                                        <span style={{
                                            fontSize: '11px',
                                            fontWeight: 700,
                                            color: '#475569',
                                            textAlign: 'right'
                                        }}>
                                            {formatQty(qtyPerEmployee)} {item.unit}
                                        </span>
                                    </div>
                                );
                            })}

                            {(visibleItems || []).length === 0 && (
                                <div style={{
                                    padding: '24px',
                                    textAlign: 'center',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    color: '#94a3b8',
                                    textTransform: 'uppercase'
                                }}>
                                    Nenhum item alocado para este grupo
                                </div>
                            )}
                        </div>

                        {/* Footer Divider */}
                        <div style={{
                            height: '2px',
                            width: '100%',
                            borderTop: `2px dashed ${orange}`,
                            marginTop: 'auto'
                        }} />

                        {/* Footer with employee name */}
                        <div style={{
                            padding: '10px 16px',
                            backgroundColor: lightGray,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <p style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    textTransform: 'uppercase',
                                    color: darkBlue,
                                    margin: 0
                                }}>
                                    {companyName}
                                </p>
                                <p style={{
                                    fontSize: '10px',
                                    color: '#475569',
                                    fontWeight: 600,
                                    margin: '2px 0 0 0'
                                }}>
                                    Portador: <span style={{
                                        fontWeight: 900,
                                        color: orange,
                                        textDecoration: 'underline'
                                    }}>{name}</span>
                                </p>
                            </div>
                            <div style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                color: '#64748b',
                                textTransform: 'uppercase'
                            }}>
                                {isNonDrinker ? '🥤 CESTA ESPECIAL' : '🍺 CESTA PADRÃO'}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
