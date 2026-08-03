import React from 'react';
import { Box, Typography } from '@mui/material';
import TextFieldInput from './TextFieldInput';
import TextareaInput from './TextareaInput';
import EditorInput from './EditorInput';
import FileInput from './FileInput';

export default function DataFields({ setting, name, value, onChange, onFileChange, getFileUrl }) {
    const fields = setting.params?.fields || {};

    const handleFieldChange = (field, val) => {
        onChange({ ...value, [field]: val });
    };

    return (
        <Box>
            <Box component="dl" sx={{
                '& dt': {
                    fontWeight: 'bold',
                    mb: 0.5,
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                },
                '& dd': {
                    mb: 2,
                    ml: 2,
                },
            }}>
                {Object.entries(fields).map(([field, params]) => (
                    <React.Fragment key={field}>
                        <Typography component="dt" variant="body2">
                            {params.title}
                        </Typography>
                        <Box component="dd">
                            {params.type === 0 && (
                                <TextFieldInput
                                    name={`${name}[${field}]`}
                                    value={value[field] || ''}
                                    onChange={(val) => handleFieldChange(field, val)}
                                    placeholder={params.title}
                                />
                            )}

                            {params.type === 1 && (
                                <TextareaInput
                                    name={`${name}[${field}]`}
                                    value={value[field] || ''}
                                    onChange={(val) => handleFieldChange(field, val)}
                                    placeholder={params.title}
                                />
                            )}

                            {params.type === 2 && (
                                <EditorInput
                                    name={`${name}[${field}]`}
                                    value={value[field] || ''}
                                    onChange={(val) => handleFieldChange(field, val)}
                                />
                            )}

                            {params.type === 3 && (
                                <FileInput
                                    name={`${name}[${field}]`}
                                    value={value[field]}
                                    fileUrl={getFileUrl(value[field], setting.file_urls, field)}
                                    onChange={(val) => handleFieldChange(field, val)}
                                    onFileChange={onFileChange}
                                    placeholder={params.title}
                                />
                            )}
                        </Box>
                    </React.Fragment>
                ))}
            </Box>
        </Box>
    );
}
