use hdk::prelude::*;
use std::convert::Infallible;

#[derive(thiserror::Error, Debug)]
pub enum HowError {
    #[error(transparent)]
    Serialization(#[from] SerializedBytesError),
    #[error(transparent)]
    Infallible(#[from] Infallible),
    #[error(transparent)]
    EntryError(#[from] EntryError),
    #[error("Failed to convert an agent link tag to an agent pub key")]
    AgentTag,
    #[error(transparent)]
    Wasm(#[from] WasmError),
    #[error(transparent)]
    Timestamp(#[from] TimestampError),
    #[error("Tree path does not exist")]
    MissingPath,
    #[error("Document not found")]
    DocumentNotFound,
}

pub type HowResult<T> = Result<T, HowError>;

impl From<HowError> for WasmError {
    fn from(c: HowError) -> Self {
        wasm_error!(WasmErrorInner::Guest(c.to_string()))
    }
}
