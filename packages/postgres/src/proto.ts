import { inspect } from 'node:util';

export function readMessage(message: DataView): string {
  const kind = message.getInt8(0);
  const length = message.getInt32(1, false);

  if (kind === 82 /*R*/) {
    // Authentication
    const authType = message.getInt32(5, false);
    if (authType === 0) {
      // AuthenticationOk
      return 'AuthenticationOk';
    } else if (authType === 2) {
      // AuthenticationKerberosV5
      return 'AuthenticationKerberosV5';
    } else if (authType === 3) {
      // AuthenticationCleartextPassword
      return 'AuthenticationCleartextPassword';
    } else if (authType === 5) {
      // AuthenticationMD5Password
      const salt = Buffer.from(message.buffer, message.byteOffset + 9, 4);
      return `AuthenticationMD5Password: ${salt.toString('base64')}`;
    } else if (authType === 7) {
      // AuthenticationGSS
      return 'AuthenticationGSS';
    } else if (authType === 8) {
      // AuthenticationGSSContinue
      const authData = Buffer.from(message.buffer, message.byteOffset + 9, length - 9);
      return `AuthenticationGSSContinue: ${inspect(authData)}`;
    } else if (authType === 9) {
      // AuthenticationSSPI
      return 'AuthenticationSSPI';
    } else if (authType === 10) {
      // AuthenticationSASL
      const authMethods: string[] = [];
      let offset = 9;
      const messageEnd = length + 1;
      const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
      while (offset < messageEnd) {
        const end = buf.indexOf(0, offset);
        if (end === offset) {
          break;
        }

        const name = Buffer.from(
          message.buffer,
          message.byteOffset + offset,
          end - offset,
        ).toString('ascii');
        authMethods.push(name);

        offset = end + 1;
      }
      return `AuthenticationSASL: ${inspect(authMethods, { colors: true, compact: true, showHidden: false })}`;
    } else if (authType === 11) {
      // AuthenticationSASLContinue
      const authData = Buffer.from(
        message.buffer,
        message.byteOffset + 9,
        message.byteLength - 9,
      ).toString('utf8');
      return `AuthenticationSASLContinue: ${authData}`;
    } else if (authType === 12) {
      // AuthenticationSASLFinal
      const authData = Buffer.from(
        message.buffer,
        message.byteOffset + 9,
        message.byteLength - 9,
      ).toString('utf8');
      return `AuthenticationSASLFinal: ${authData}`;
    } else {
      throw Object.assign(new Error('not supported'), { authType });
    }
  } else if (kind === 75 /*K*/) {
    // BackendKeyData
    const pid = message.getInt32(5, false);
    const secretKey = message.getInt32(9, false);
    return `BackendKeyData: pid=${pid} ; secretKey=${secretKey}`;
  } else if (kind === 50 /*2*/) {
    // BindComplete
    return 'BindComplete';
  } else if (kind === 51 /*3*/) {
    // CloseComplete
    return 'CloseComplete';
  } else if (kind === 67 /*C*/) {
    // CommandComplete
    const tag = Buffer.from(
      message.buffer,
      message.byteOffset + 5,
      message.byteLength - 6,
    ).toString('ascii');
    // INSERT 0 count
    // DELETE|UPDATE|MERGE|SELECT|MOVE|FETCH|COPY count
    return `CommandComplete: ${tag}`;
  } else if (kind === 100 /*d*/) {
    // CopyData
    const data = Buffer.from(message.buffer, message.byteOffset + 5, message.byteLength - 5);
    return `CopyData ${inspect(data, { colors: true, compact: true })}`;
  } else if (kind === 99 /*c*/) {
    // CopyDone
    return 'CopyDone';
  } else if (kind === 71 /*G*/) {
    // CopyInResponse
    const format = message.getInt8(5); // 0 - text, 1 - binary
    const nColumns = message.getInt16(6, false);
    const columnFormats = new Array(nColumns);
    for (let i = 0, offset = 8; i < nColumns; i++, offset += 2) {
      columnFormats[i] = message.getInt16(offset, false);
    }
    return `CopyInResponse: ${inspect({ format, columnFormats }, { colors: true, compact: true })}`;
  } else if (kind === 72 /*H*/) {
    // CopyOutResponse
    const format = message.getInt8(5); // 0 - text, 1 - binary
    const nColumns = message.getInt16(6, false);
    const columnFormats = new Array<number>(nColumns);
    for (let i = 0, offset = 8; i < nColumns; i++, offset += 2) {
      columnFormats[i] = message.getInt16(offset, false);
    }
    return `CopyOutResponse: ${inspect({ format, columnFormats }, { colors: true, compact: true })}`;
  } else if (kind === 87 /*W*/) {
    // CopyBothResponse
    const format = message.getInt8(5); // 0 - text, 1 - binary
    const nColumns = message.getInt16(6, false);
    const columnFormats = new Array<number>(nColumns);
    for (let i = 0, offset = 8; i < nColumns; i++, offset += 2) {
      columnFormats[i] = message.getInt16(offset, false);
    }
    return `CopyBothResponse: ${inspect({ format, columnFormats }, { colors: true, compact: true })}`;
  } else if (kind === 68 /*D*/) {
    // DataRow
    const nColumns = message.getInt16(5, false);
    const values = new Array(nColumns);
    for (let i = 0, offset = 7; i < nColumns; i++) {
      const length = message.getInt32(offset, false);
      if (length === -1) {
        offset += 4;
        values[i] = null;
      } else {
        const start = offset + 4;
        values[i] = Buffer.from(message.buffer, message.byteOffset + start, length);
        offset = start + length;
      }
    }
    return `DataRow: ${inspect(values, { colors: true, compact: false, showHidden: false })}`;
  } else if (kind === 73 /*I*/) {
    // EmptyQueryResponse
    return 'EmptyQueryResponse';
  } else if (kind === 69 /*E*/) {
    // ErrorResponse
    const data = readNoticeOrError(message);
    return `ErrorResponse\n${inspect(data, { colors: true, compact: false, showHidden: false })}`;
  } else if (kind === 86 /*V*/) {
    // FunctionCallResponse
    const length = message.getInt32(5, false);
    let value: null | Buffer;
    if (length === -1) {
      value = null;
    } else {
      value = Buffer.from(message.buffer, message.byteOffset + 9, length);
    }
    return `FunctionCallResponse: ${value?.toString('utf8') ?? 'null'}`;
  } else if (kind === 118 /*v*/) {
    // NegotiateProtocolVersion
    const minor = message.getInt32(5, false);
    const nOptions = message.getInt32(9, false);
    const unrecognizedOptions = new Array<Buffer>(nOptions);

    const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
    for (let i = 0, offset = 13; i < nOptions; i++) {
      const valueEnd = buf.indexOf(0, offset);
      unrecognizedOptions[i] = Buffer.from(
        message.buffer,
        message.byteOffset + offset,
        valueEnd - offset,
      );
      offset = valueEnd + 1;
    }
    return `NegotiateProtocolVersion: ${inspect({ minor, unrecognizedOptions }, { colors: true, compact: true, showHidden: false })}`;
  } else if (kind === 110 /*n*/) {
    // NoData
    return 'NoData';
  } else if (kind === 78 /*N*/) {
    // NoticeResponse
    const data = readNoticeOrError(message);
    return `NoticeResponse\n${inspect(data, { colors: true, compact: false, showHidden: false })}`;
  } else if (kind === 65 /*A*/) {
    // NotificationResponse

    const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
    const channelEnd = buf.indexOf(0, 9);
    const payloadStart = channelEnd + 1;
    const payloadEnd = buf.indexOf(0, payloadStart);

    const pid = message.getInt32(5, false);
    const channel = Buffer.from(message.buffer, message.byteOffset + 9, channelEnd - 9).toString(
      'ascii',
    );
    const payload = Buffer.from(buf.subarray(payloadStart, payloadEnd)).toString('ascii');
    return `NotificationResponse: ${inspect({ pid, channel, payload }, { colors: true, compact: true })}`;
  } else if (kind === 116 /*t*/) {
    // ParameterDescription
    const nParams = message.getInt16(5, false);
    const params = new Array<number>(nParams);
    for (let i = 0, offset = 7; i < nParams; i++, offset += 4) {
      params[i] = message.getInt32(offset, false);
    }
    return `ParameterDescription: ${inspect(params, { colors: true, compact: false, showHidden: false })}`;
  } else if (kind === 83 /*S*/) {
    // ParameterStatus
    let nameEnd = 4;
    while (message.getInt8(++nameEnd) !== 0) {}
    let valueEnd = nameEnd;
    while (message.getInt8(++valueEnd) !== 0) {}

    const buf = Buffer.from(message.buffer, message.byteOffset, message.byteLength);
    const name = buf.toString(undefined, 5, nameEnd);
    const value = buf.toString(undefined, nameEnd + 1, valueEnd);
    return `ParameterStatus: name=${name} ; value=${value}`;
  } else if (kind === 49 /*1*/) {
    // ParseComplete
    return 'ParseComplete';
  } else if (kind === 115 /*s*/) {
    // PortalSuspended
    return 'PortalSuspended';
  } else if (kind === 90 /*Z*/) {
    // ReadyForQuery
    // I(73) - idle, T(84) - transaction, E(69) - failed transaction
    const status = message.getInt8(5);
    return `ReadyForQuery: ${String.fromCodePoint(status)}`;
  } else if (kind === 84 /*T*/) {
    // RowDescription
    const nFields = message.getInt16(5, false);
    const fields = new Array(nFields);
    const buf = new Uint8Array(message.buffer, message.byteOffset, message.byteLength);
    for (let i = 0, offset = 7; i < nFields; i++) {
      const field = {
        name: '',
        table: 0,
        columnIdx: 0,
        type: 0,
        typeSize: 0,
        typeModifier: 0,
        format: 0,
      };
      fields[i] = field;

      const nameEnd = buf.indexOf(0, offset);
      field.name = Buffer.from(
        message.buffer,
        message.byteOffset + offset,
        nameEnd - offset,
      ).toString('ascii');
      field.table = message.getInt32(nameEnd + 1, false);
      field.columnIdx = message.getInt16(nameEnd + 5, false);
      field.type = message.getInt32(nameEnd + 7, false);
      field.typeSize = message.getInt16(nameEnd + 11, false);
      field.typeModifier = message.getInt32(nameEnd + 13, false);
      field.format = message.getInt16(nameEnd + 17, false);
      offset = nameEnd + 19;
    }
    return `RowDescription\n${inspect(fields, { colors: true, compact: false, showHidden: false })}`;
  }

  return `unknown message: ${kind} (${message.byteLength})\n${inspect(message, { colors: true, compact: true })}`;
}

export interface NoticeOrError {
  severityLocalized: string;
  severity: string;
  code: string;
  message: string;
  detail: string | undefined;
  hint: string | undefined;
  position: string | undefined;
  internalPosition: string | undefined;
  internalQuery: string | undefined;
  where: string | undefined;
  schema: string | undefined;
  table: string | undefined;
  column: string | undefined;
  dataType: string | undefined;
  constraint: string | undefined;
  file: string | undefined;
  line: string | undefined;
  routine: string | undefined;
}

export function readNoticeOrError(message: DataView): NoticeOrError {
  const data: NoticeOrError = {
    severityLocalized: '',
    severity: '',
    code: '',
    message: '',
    detail: undefined,
    hint: undefined,
    position: undefined,
    internalPosition: undefined,
    internalQuery: undefined,
    where: undefined,
    schema: undefined,
    table: undefined,
    column: undefined,
    dataType: undefined,
    constraint: undefined,
    file: undefined,
    line: undefined,
    routine: undefined,
  };

  const buf = Buffer.from(message.buffer, message.byteOffset, message.byteLength);
  let offset = 5;
  const messageEnd = message.byteLength;
  while (offset < messageEnd) {
    const field = message.getInt8(offset);
    if (field === 0) {
      break;
    }

    const valueStart = offset + 1;
    let valueEnd = valueStart;
    while (message.getInt8(valueEnd++) !== 0) {}
    buf.indexOf(0, valueStart);
    const value = buf.toString(undefined, valueStart, valueEnd - 1);
    offset = valueEnd;
    switch (field) {
      case 83 /*S*/: {
        data.severityLocalized = value;
        break;
      }
      case 86 /*V*/: {
        data.severity = value;
        break;
      }
      case 67 /*C*/: {
        data.code = value;
        break;
      }
      case 77 /*M*/: {
        data.message = value;
        break;
      }
      case 68 /*D*/: {
        data.detail = value;
        break;
      }
      case 72 /*H*/: {
        data.hint = value;
        break;
      }
      case 80 /*P*/: {
        data.position = value;
        break;
      }
      case 112 /*p*/: {
        data.internalPosition = value;
        break;
      }
      case 113 /*q*/: {
        data.internalQuery = value;
        break;
      }
      case 87 /*W*/: {
        data.where = value;
        break;
      }
      case 115 /*s*/: {
        data.schema = value;
        break;
      }
      case 116 /*t*/: {
        data.table = value;
        break;
      }
      case 99 /*c*/: {
        data.column = value;
        break;
      }
      case 100 /*d*/: {
        data.dataType = value;
        break;
      }
      case 110 /*n*/: {
        data.constraint = value;
        break;
      }
      case 70 /*F*/: {
        data.file = value;
        break;
      }
      case 76 /*L*/: {
        data.line = value;
        break;
      }
      case 82 /*R*/: {
        data.routine = value;
        break;
      }
      default: {
        break;
      }
    }
  }

  return data;
}
