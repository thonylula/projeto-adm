import React from 'react';
import type { InvoiceData } from '../types';

interface InvoiceSummaryProps {
    data: InvoiceData;
    companyName: string;
    recipientCnpj?: string;
    sloganImage?: string | null;
    companyLogo?: string | null;
}

export const InvoiceSummary: React.FC<InvoiceSummaryProps> = ({ data, companyName, sloganImage, companyLogo }) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const orange = '#f97316';
    const darkBlue = '#1e293b';
    const lightGray = '#f8fafc';
    const mediumGray = '#f1f5f9';

    return (
        <div
            style={{
                backgroundColor: '#ffffff',
                border: `4px solid ${orange}`,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#444',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact'
            } as React.CSSProperties}
        >
            {/* Header - Dark Blue Background like APP */}
            <div style={{
                backgroundColor: darkBlue,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start'
            }}>
                <div>
                    <h1 style={{
                        fontSize: '22px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        color: '#ffffff',
                        margin: 0,
                        lineHeight: 1.2,
                        letterSpacing: '-0.5px'
                    }}>
                        {companyName || data.recipientName}
                    </h1>
                    <p style={{
                        fontSize: '13px',
                        color: '#94a3b8',
                        fontWeight: 700,
                        margin: '4px 0 0 0'
                    }}>
                        CNPJ: {data.recipientCnpj || '---'}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: orange,
                        margin: 0
                    }}>
                        Data: {data.issueDate || '---'}
                    </p>
                </div>
            </div>

            {/* Meta Info Grid - White background */}
            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                padding: '12px 16px',
                backgroundColor: '#ffffff',
                borderBottom: '1px solid #e2e8f0'
            }}>
                {[
                    { label: 'Emitente', value: data.issuerName || '---', width: '33%' },
                    { label: 'Destinatário', value: data.recipientName || '---', width: '33%' },
                    { label: 'Número da Nota', value: data.invoiceNumber || '---', width: '15%' },
                    { label: 'Série', value: data.series || '1', width: '5%' },
                    { label: 'Emissão', value: data.issueDate || '---', width: '14%' },
                    { label: 'Valor Total', value: formatCurrency(data.totalValue), isPrice: true, width: '100%' }
                ].map((info, i) => (
                    <div key={i} style={{
                        width: info.width,
                        padding: '4px 8px',
                        marginBottom: '4px'
                    }}>
                        <p style={{
                            fontSize: '9px',
                            color: '#64748b',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            margin: 0,
                            letterSpacing: '0.5px'
                        }}>
                            {info.label}
                        </p>
                        <p style={{
                            fontSize: info.isPrice ? '18px' : '11px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            color: info.isPrice ? '#16a34a' : darkBlue,
                            margin: '2px 0 0 0'
                        }}>
                            {info.value}
                        </p>
                    </div>
                ))}
            </div>

            {/* Orange Divider Bar */}
            <div style={{
                height: '6px',
                width: '100%',
                backgroundColor: orange
            }} />

            {/* Items Section Header */}
            <div style={{
                padding: '12px 16px 8px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#ffffff'
            }}>
                <h2 style={{
                    fontSize: '14px',
                    fontWeight: 900,
                    color: darkBlue,
                    textTransform: 'uppercase',
                    margin: 0,
                    letterSpacing: '0.5px'
                }}>
                    ITENS DA NOTA
                </h2>
                <span style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: '#64748b',
                    backgroundColor: lightGray,
                    padding: '2px 8px',
                    borderRadius: '4px'
                }}>
                    Qtd: {data.items?.length || 0}
                </span>
            </div>

            {/* Items Table */}
            <div style={{ padding: '0 16px' }}>
                <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '11px'
                }}>
                    <thead>
                        <tr style={{
                            backgroundColor: lightGray,
                            borderBottom: `2px solid ${orange}`
                        }}>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Código</th>
                            <th style={{ padding: '10px 8px', textAlign: 'left', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Descrição</th>
                            <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Quantidade</th>
                            <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Preço Unit.</th>
                            <th style={{ padding: '10px 8px', textAlign: 'right', fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data?.items || []).map((item, index) => (
                            <tr
                                key={item.id || index}
                                style={{
                                    backgroundColor: index % 2 === 0 ? '#ffffff' : mediumGray,
                                    borderBottom: '1px solid #e2e8f0'
                                }}
                            >
                                <td style={{
                                    padding: '10px 8px',
                                    color: '#64748b',
                                    fontWeight: 600,
                                    fontFamily: 'monospace',
                                    fontSize: '10px'
                                }}>
                                    {item.code || '---'}
                                </td>
                                <td style={{
                                    padding: '10px 8px',
                                    color: darkBlue,
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    fontSize: '11px'
                                }}>
                                    {item.description}
                                </td>
                                <td style={{
                                    padding: '10px 8px',
                                    textAlign: 'right',
                                    color: '#334155',
                                    fontWeight: 700,
                                    fontSize: '11px'
                                }}>
                                    {(item.quantity || 0).toLocaleString('pt-BR', { minimumFractionDigits: 3 })} {item.unit || ''}
                                </td>
                                <td style={{
                                    padding: '10px 8px',
                                    textAlign: 'right',
                                    color: '#64748b',
                                    fontWeight: 600,
                                    fontSize: '11px'
                                }}>
                                    {formatCurrency(item.price || 0)}
                                </td>
                                <td style={{
                                    padding: '10px 8px',
                                    textAlign: 'right',
                                    fontWeight: 900,
                                    color: darkBlue,
                                    fontSize: '12px'
                                }}>
                                    {formatCurrency(item.total || 0)}
                                </td>
                            </tr>
                        ))}
                        {/* Total Row */}
                        <tr style={{
                            backgroundColor: lightGray,
                            borderTop: `2px solid ${orange}`
                        }}>
                            <td colSpan={4} style={{
                                padding: '12px 8px',
                                textAlign: 'right',
                                fontSize: '12px',
                                fontWeight: 900,
                                color: darkBlue,
                                textTransform: 'uppercase'
                            }}>
                                Total Geral:
                            </td>
                            <td style={{
                                padding: '12px 8px',
                                textAlign: 'right',
                                fontSize: '16px',
                                fontWeight: 900,
                                color: '#16a34a'
                            }}>
                                {formatCurrency((data?.items || []).reduce((sum, item) => sum + (item.total || 0), 0))}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: '1px solid #e2e8f0',
                backgroundColor: lightGray,
                marginTop: '8px'
            }}>
                <div style={{
                    fontSize: '10px',
                    color: '#64748b',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>
                    Resumo Automatizado do Sistema
                </div>
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
            </div>
        </div>
    );
};
