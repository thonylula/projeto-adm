import React from 'react';

interface SignatureSheetProps {
    employeeNames: string[];
    companyName: string;
    recipientCnpj?: string;
    sloganImage?: string | null;
    companyLogo?: string | null;
}

export const SignatureSheet: React.FC<SignatureSheetProps> = ({ employeeNames, companyName, recipientCnpj, sloganImage, companyLogo }) => {
    const orange = '#f97316';
    const darkBlue = '#1e293b';
    const lightGray = '#f8fafc';

    return (
        <div
            className="avoid-page-break"
            style={{
                backgroundColor: '#ffffff',
                border: `4px solid ${orange}`,
                fontFamily: 'system-ui, -apple-system, sans-serif',
                color: '#444',
                WebkitPrintColorAdjust: 'exact',
                printColorAdjust: 'exact',
                pageBreakInside: 'avoid',
                breakInside: 'avoid'
            } as React.CSSProperties}
        >
            {/* Header - Dark Blue Background like APP */}
            <div style={{
                backgroundColor: darkBlue,
                padding: '16px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                pageBreakAfter: 'avoid',
                breakAfter: 'avoid'
            } as React.CSSProperties}>
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
                        {companyName}
                    </h1>
                    <p style={{
                        fontSize: '13px',
                        color: '#94a3b8',
                        fontWeight: 700,
                        margin: '4px 0 0 0'
                    }}>
                        CNPJ: {recipientCnpj || '---'}
                    </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <p style={{
                        fontSize: '14px',
                        fontWeight: 800,
                        color: '#ffffff',
                        margin: 0
                    }}>
                        Data: {new Date().toLocaleDateString('pt-BR')}
                    </p>
                </div>
            </div>

            {/* Orange Divider Bar */}
            <div style={{
                height: '6px',
                width: '100%',
                backgroundColor: orange,
                pageBreakAfter: 'avoid',
                breakAfter: 'avoid'
            } as React.CSSProperties} />

            {/* Signature Table */}
            <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                pageBreakBefore: 'avoid',
                breakBefore: 'avoid'
            } as React.CSSProperties}>
                <thead>
                    <tr style={{ backgroundColor: lightGray }}>
                        <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: 900,
                            color: darkBlue,
                            textTransform: 'uppercase',
                            borderBottom: `2px solid ${orange}`,
                            borderRight: `2px solid ${orange}`,
                            width: '40%'
                        }}>
                            Nome Funcionário
                        </th>
                        <th style={{
                            padding: '12px 16px',
                            textAlign: 'left',
                            fontSize: '12px',
                            fontWeight: 900,
                            color: darkBlue,
                            textTransform: 'uppercase',
                            borderBottom: `2px solid ${orange}`
                        }}>
                            Assinatura de Recebimento
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {(employeeNames || []).map((name, index) => (
                        <tr key={index} style={{
                            borderBottom: `1px solid ${orange}`,
                            backgroundColor: '#ffffff'
                        }}>
                            <td style={{
                                padding: '12px 16px',
                                fontSize: '11px',
                                fontWeight: 800,
                                color: darkBlue,
                                textTransform: 'uppercase',
                                borderRight: `2px solid ${orange}`,
                                verticalAlign: 'middle'
                            }}>
                                {name}
                            </td>
                            <td style={{
                                padding: '12px 16px',
                                verticalAlign: 'bottom'
                            }}>
                                {/* Signature line - empty space for signature */}
                                <div style={{
                                    width: '100%',
                                    height: '24px',
                                    borderBottom: '1px solid #cbd5e1'
                                }} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Footer */}
            <div style={{
                padding: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderTop: `2px solid ${orange}`,
                backgroundColor: lightGray
            }}>
                <div style={{
                    fontSize: '10px',
                    color: '#64748b',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                }}>
                    Protocolo de Recebimento Individualizado
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
